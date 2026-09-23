import {
  SchoolDatabase,
  Student,
  Teacher,
  ClassRoom,
  Subject,
  GradeEntry,
  GradeAudit,
  StudentAttendance,
  TeacherAttendance,
  ReportCardValidation,
  ActivityLog,
  SchoolSettings,
  SchoolSummary,
} from '../types';
import { INITIAL_DEMO_DATABASE, simpleHash } from '../demoData';
import { firestore } from '../firebase/config';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  Unsubscribe,
} from 'firebase/firestore';

class DatabaseService {
  private cache: SchoolDatabase | null = null;
  private activeSchoolId: string = 'demo_saint_michel';
  private listeners: ((db: SchoolDatabase) => void)[] = [];
  private schoolsList: SchoolSummary[] = [];
  private schoolsListeners: ((schools: SchoolSummary[]) => void)[] = [];
  private activeSchoolUnsubscribe: Unsubscribe | null = null;
  private schoolsDirectoryUnsubscribe: Unsubscribe | null = null;
  private isFirestoreConnected: boolean = false;

  constructor() {
    this.init();
  }

  private ensureSignatures(db: SchoolDatabase): boolean {
    let changed = false;
    // Ensure demo teachers have their signature and proper demo password if unmodified
    for (const teacher of db.teachers) {
      const demo = INITIAL_DEMO_DATABASE.teachers.find((t) => t.id === teacher.id);
      if (!teacher.signatureUrl && demo?.signatureUrl) {
        teacher.signatureUrl = demo.signatureUrl;
        changed = true;
      }
      if (demo && teacher.passwordHash === simpleHash('prof123') && demo.passwordHash !== simpleHash('prof123')) {
        teacher.passwordHash = demo.passwordHash;
        changed = true;
      }
    }

    // Ensure Director has signature for bulletin bottom
    if (!db.settings.directorSignatureUrl && INITIAL_DEMO_DATABASE.settings.directorSignatureUrl) {
      db.settings.directorSignatureUrl = INITIAL_DEMO_DATABASE.settings.directorSignatureUrl;
      changed = true;
    }

    // Sanitize grades: grade signatures must be the teacher's signature, never the director's signature!
    if (db.settings.directorSignatureUrl) {
      for (const grade of db.grades) {
        if (grade.signatureUrl && grade.signatureUrl === db.settings.directorSignatureUrl) {
          const teacher = db.teachers.find(
            (t) =>
              t.assignedSubjectIds.includes(grade.subjectId) &&
              t.assignedClassIds.includes(grade.classId)
          ) || db.teachers.find((t) => t.id === grade.teacherId);

          if (teacher?.signatureUrl) {
            grade.signatureUrl = teacher.signatureUrl;
            grade.teacherName = `Prof. ${teacher.firstName} ${teacher.lastName}`;
            changed = true;
          }
        }
      }
    }

    return changed;
  }

  private init(): void {
    if (typeof window === 'undefined') return;
    try {
      const savedSchoolId = localStorage.getItem('active_school_id');
      if (savedSchoolId) {
        this.activeSchoolId = savedSchoolId;
      }

      const storedDb = localStorage.getItem(`school_db_${this.activeSchoolId}`);
      if (storedDb) {
        this.cache = JSON.parse(storedDb);
        if (this.cache && this.activeSchoolId === 'demo_saint_michel' && this.ensureSignatures(this.cache)) {
          this.persist(this.cache);
        }
      } else if (this.activeSchoolId === 'demo_saint_michel') {
        this.cache = { ...INITIAL_DEMO_DATABASE };
        this.persist(this.cache);
      }
    } catch (e) {
      console.error('Error loading local database:', e);
      if (this.activeSchoolId === 'demo_saint_michel') {
        this.cache = { ...INITIAL_DEMO_DATABASE };
      }
    }

    // Initialize Firestore synchronization
    this.initSchoolsDirectorySync();
    this.initActiveSchoolSync(this.activeSchoolId);
  }

  private initSchoolsDirectorySync(): void {
    if (typeof window === 'undefined') return;
    try {
      const schoolsCollRef = collection(firestore, 'schools');
      this.schoolsDirectoryUnsubscribe = onSnapshot(
        schoolsCollRef,
        (snapshot) => {
          const list: SchoolSummary[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              schoolName: data.schoolName || data.database?.settings?.schoolName || 'Établissement',
              directorName: data.directorName || data.database?.settings?.directorName || 'Directeur',
              phone: data.phone || data.database?.settings?.phone || '',
              address: data.address || data.database?.settings?.address || '',
              email: data.email || data.database?.settings?.email || '',
              isDemo: Boolean(data.isDemo ?? (docSnap.id === 'demo_saint_michel')),
              createdAt: data.createdAt || '',
            });
          });

          // Always ensure the Demo school is present
          if (!list.some((s) => s.id === 'demo_saint_michel')) {
            list.unshift({
              id: 'demo_saint_michel',
              schoolName: INITIAL_DEMO_DATABASE.settings.schoolName,
              directorName: INITIAL_DEMO_DATABASE.settings.directorName,
              phone: INITIAL_DEMO_DATABASE.settings.phone,
              address: INITIAL_DEMO_DATABASE.settings.address,
              isDemo: true,
              createdAt: new Date().toISOString(),
            });
          }

          this.schoolsList = list;
          localStorage.setItem('schools_directory', JSON.stringify(list));
          this.notifySchools();
        },
        (err) => {
          console.warn('Firestore schools directory listener status:', err.message);
        }
      );
    } catch (err) {
      console.error('Error starting schools directory listener:', err);
    }
  }

  private initActiveSchoolSync(schoolId: string): void {
    if (typeof window === 'undefined') return;
    try {
      if (this.activeSchoolUnsubscribe) {
        this.activeSchoolUnsubscribe();
        this.activeSchoolUnsubscribe = null;
      }

      const schoolDocRef = doc(firestore, 'schools', schoolId);
      this.activeSchoolUnsubscribe = onSnapshot(
        schoolDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const remoteData = snapshot.data();
            const remoteDb = (remoteData.database as SchoolDatabase) || (remoteData as unknown as SchoolDatabase);
            if (remoteDb && remoteDb.settings) {
              this.cache = remoteDb;
              this.isFirestoreConnected = true;
              if (this.activeSchoolId === 'demo_saint_michel') {
                this.ensureSignatures(this.cache);
              }
              localStorage.setItem(`school_db_${this.activeSchoolId}`, JSON.stringify(this.cache));
              this.notify();
            }
          } else {
            // If demo school does not exist yet on Firestore, seed it automatically
            if (schoolId === 'demo_saint_michel' && this.cache) {
              const seedDoc = {
                id: 'demo_saint_michel',
                schoolName: INITIAL_DEMO_DATABASE.settings.schoolName,
                directorName: INITIAL_DEMO_DATABASE.settings.directorName,
                phone: INITIAL_DEMO_DATABASE.settings.phone,
                address: INITIAL_DEMO_DATABASE.settings.address,
                email: INITIAL_DEMO_DATABASE.settings.email,
                isDemo: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                database: JSON.parse(JSON.stringify(this.cache)),
              };
              setDoc(schoolDocRef, seedDoc)
                .then(() => {
                  this.isFirestoreConnected = true;
                  this.notify();
                })
                .catch((e) => console.error('Error seeding demo school into Firestore:', e));
            }
          }
        },
        (err) => {
          console.warn('Firestore onSnapshot listener status:', err.message);
          this.isFirestoreConnected = false;
          this.notify();
        }
      );
    } catch (err) {
      console.error('Error initializing Firestore listener for school:', err);
    }
  }

  public getActiveSchoolId(): string {
    return this.activeSchoolId;
  }

  public getSchoolsList(): SchoolSummary[] {
    if (this.schoolsList.length > 0) return this.schoolsList;
    try {
      const stored = localStorage.getItem('schools_directory');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return [
      {
        id: 'demo_saint_michel',
        schoolName: INITIAL_DEMO_DATABASE.settings.schoolName,
        directorName: INITIAL_DEMO_DATABASE.settings.directorName,
        phone: INITIAL_DEMO_DATABASE.settings.phone,
        address: INITIAL_DEMO_DATABASE.settings.address,
        isDemo: true,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  public subscribeSchools(listener: (schools: SchoolSummary[]) => void): () => void {
    this.schoolsListeners.push(listener);
    listener(this.getSchoolsList());
    return () => {
      this.schoolsListeners = this.schoolsListeners.filter((l) => l !== listener);
    };
  }

  private notifySchools(): void {
    const list = this.getSchoolsList();
    this.schoolsListeners.forEach((l) => {
      try {
        l(list);
      } catch (err) {
        console.error('Schools listener error:', err);
      }
    });
  }

  public async switchActiveSchool(schoolId: string): Promise<void> {
    if (!schoolId) return;
    this.activeSchoolId = schoolId;
    localStorage.setItem('active_school_id', schoolId);

    // Try loading local cached state first
    const stored = localStorage.getItem(`school_db_${schoolId}`);
    if (stored) {
      try {
        this.cache = JSON.parse(stored);
        this.notify();
      } catch {}
    } else if (schoolId === 'demo_saint_michel') {
      this.cache = { ...INITIAL_DEMO_DATABASE };
      this.notify();
    }

    // Attach active Firestore listener to this school
    this.initActiveSchoolSync(schoolId);
  }

  public isRealtimeActive(): boolean {
    return this.isFirestoreConnected;
  }

  public subscribe(listener: (db: SchoolDatabase) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    const current = this.getDatabase();
    this.listeners.forEach((listener) => {
      try {
        listener(current);
      } catch (err) {
        console.error('Listener notification error:', err);
      }
    });
  }

  private persist(db: SchoolDatabase): void {
    this.cache = db;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`school_db_${this.activeSchoolId}`, JSON.stringify(db));
      } catch (err) {
        console.error('LocalStorage write error:', err);
      }
    }
    // Real-time sync with Firebase Firestore directly under /schools/{this.activeSchoolId}
    this.syncWithFirestore(db);
    // Asynchronously sync with backend server if available
    this.syncWithServer(db);
    this.notify();
  }

  private async syncWithFirestore(db: SchoolDatabase): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        const schoolDocRef = doc(firestore, 'schools', this.activeSchoolId);
        const cleanDb = JSON.parse(JSON.stringify(db));
        await setDoc(
          schoolDocRef,
          {
            id: this.activeSchoolId,
            schoolName: db.settings.schoolName,
            directorName: db.settings.directorName,
            phone: db.settings.phone || '',
            address: db.settings.address || '',
            email: db.settings.email || '',
            isDemo: this.activeSchoolId === 'demo_saint_michel',
            updatedAt: new Date().toISOString(),
            database: cleanDb,
          },
          { merge: true }
        );
        this.isFirestoreConnected = true;
      }
    } catch (err) {
      console.warn('Firestore real-time sync write:', err);
    }
  }

  private async syncWithServer(db: SchoolDatabase): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        await fetch('/api/data/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schoolId: this.activeSchoolId, database: db }),
        }).catch(() => {
          // Server endpoint optional
        });
      }
    } catch {
      // silent
    }
  }

  public getDatabase(): SchoolDatabase {
    if (!this.cache) {
      this.init();
    }
    return JSON.parse(JSON.stringify(this.cache || INITIAL_DEMO_DATABASE));
  }

  public async saveDatabase(db: SchoolDatabase): Promise<void> {
    this.persist(db);
  }

  public async resetToDemo(): Promise<SchoolDatabase> {
    const demo = JSON.parse(JSON.stringify(INITIAL_DEMO_DATABASE));
    this.persist(demo);
    await this.logActivity(
      demo.settings.directorName,
      'DIRECTEUR',
      'RÉINITIALISATION_DEMO',
      'La base de données a été réinitialisée avec les données scolaires de démonstration.'
    );
    return demo;
  }

  public async resetDemoDatabase(user?: string): Promise<SchoolDatabase> {
    return this.resetToDemo();
  }

  public async importDatabase(db: SchoolDatabase, user: string): Promise<void> {
    this.persist(db);
    await this.logActivity(
      user,
      'DIRECTEUR',
      'IMPORT_BASE',
      'Restauration complète de la base de données scolaire.'
    );
  }

  public async clearToEmpty(): Promise<SchoolDatabase> {
    const current = this.getDatabase();
    const empty: SchoolDatabase = {
      settings: {
        ...current.settings,
        isDemoData: false,
      },
      adminAuth: current.adminAuth,
      classes: [],
      subjects: [],
      teachers: [],
      students: [],
      grades: [],
      gradeAudits: [],
      studentAttendances: [],
      teacherAttendances: [],
      reportCardValidations: [],
      activityLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userName: current.settings.directorName,
          userRole: 'DIRECTEUR',
          action: 'RÉINITIALISATION_VIERGE',
          details: 'Base de données réinitialisée à zéro. Prête pour une nouvelle école.',
        },
      ],
    };
    this.persist(empty);
    return empty;
  }

  public exportJSON(): string {
    return JSON.stringify(this.cache, null, 2);
  }

  public async importJSON(jsonStr: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonStr) as SchoolDatabase;
      if (!parsed.settings || !Array.isArray(parsed.classes)) {
        throw new Error('Structure JSON invalide pour la gestion scolaire.');
      }
      this.persist(parsed);
      await this.logActivity(
        parsed.settings.directorName || 'Administrateur',
        'DIRECTEUR',
        'IMPORT_BASE',
        'Restauration de la base de données depuis un fichier de sauvegarde JSON.'
      );
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  }

  public async logActivity(
    userName: string,
    userRole: 'DIRECTEUR' | 'ENSEIGNANT',
    action: string,
    details: string
  ): Promise<void> {
    const db = this.getDatabase();
    const log: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      userName,
      userRole,
      action,
      details,
    };
    db.activityLogs.unshift(log);
    // Keep max 200 logs
    if (db.activityLogs.length > 200) {
      db.activityLogs = db.activityLogs.slice(0, 200);
    }
    this.persist(db);
  }

  // --- CRUD ALIASES ---
  public async createStudent(data: any, user: string): Promise<Student> {
    return this.addStudent(data, user);
  }

  public async createClass(data: any, user: string): Promise<ClassRoom> {
    return this.addClass(data, user);
  }

  public async createSubject(data: any, user: string): Promise<Subject> {
    return this.addSubject(data, user);
  }

  public async createTeacher(data: any, user: string, initialPassword?: string): Promise<Teacher> {
    return this.addTeacher({ ...data, initialPassword }, user);
  }

  // --- SETTINGS & AUTH ---
  public async updateSettings(settings: SchoolSettings, user: string): Promise<void> {
    const db = await this.getDatabase();
    db.settings = settings;
    this.persist(db);
    await this.logActivity(user, 'DIRECTEUR', 'PARAMÈTRES_ÉCOLE', "Mise à jour des paramètres généraux de l'établissement.");
  }

  public async setAdminPin(newPin: string, recoveryQuestion: string, recoveryAnswer: string): Promise<void> {
    const db = await this.getDatabase();
    db.adminAuth = {
      pinHash: simpleHash(newPin),
      isConfigured: true,
      recoveryQuestion,
      recoveryAnswerHash: simpleHash(recoveryAnswer.toLowerCase().trim()),
      lastLogin: new Date().toISOString(),
    };
    this.persist(db);
    await this.logActivity(
      db.settings.directorName,
      'DIRECTEUR',
      'SÉCURITÉ_PIN',
      'Configuration ou modification du code PIN secret du Directeur.'
    );
  }

  public async verifyAdminPin(pin: string): Promise<boolean> {
    const db = await this.getDatabase();
    return db.adminAuth.pinHash === simpleHash(pin);
  }

  public async verifyTeacherByPasswordOnly(
    pass: string
  ): Promise<{ teacher: Teacher | null; multipleMatches?: Teacher[] }> {
    const db = await this.getDatabase();
    const cleanPass = pass.trim();
    if (!cleanPass) return { teacher: null };
    const hash = simpleHash(cleanPass);

    // 1. Direct match with teacher passwordHash
    const activeTeachers = db.teachers.filter((t) => t.status === 'active');
    const matchingByHash = activeTeachers.filter((t) => t.passwordHash === hash);

    if (matchingByHash.length === 1) {
      return { teacher: matchingByHash[0] };
    }

    if (matchingByHash.length > 1) {
      return { teacher: null, multipleMatches: matchingByHash };
    }

    // 2. Also support if the teacher typed their matricule or direct id or name as password
    const directMatch = activeTeachers.find(
      (t) =>
        t.matricule.toLowerCase() === cleanPass.toLowerCase() ||
        t.id.toLowerCase() === cleanPass.toLowerCase()
    );
    if (directMatch) {
      return { teacher: directMatch };
    }

    return { teacher: null };
  }

  public async registerSchoolAndDirector(data: {
    schoolName: string;
    directorName: string;
    directorTitle?: string;
    email?: string;
    phone?: string;
    address?: string;
    pin: string;
    recoveryQuestion: string;
    recoveryAnswer: string;
  }): Promise<{ schoolId: string; schoolName: string; directorName: string }> {
    const cleanSchoolName = data.schoolName.trim().toUpperCase();
    const cleanDirectorName = data.directorName.trim();
    // Unique ID for the newly registered school
    const newSchoolId = `sch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // As requested:
    // "Ny établissement vaovao dia mbola atao vide tsy misy mpianatra , tsy misy mampianatra fa ny Directeur no mampiditra ny mpianatra misy ao aminy , izy ihany koa mampiditra classe misy ao aminy , izy ihany koa manome matière ho an'i mpampianatra tsirairay."
    const emptySchoolDb: SchoolDatabase = {
      settings: {
        schoolName: cleanSchoolName,
        motto: 'Fanabeazana - Fahaizana - Fandrosoana',
        republicTitle: "REPOBLIKAN'I MADAGASIKARA",
        nationalDevise: 'Fitiavana - Tanindrazana - Fandrosoana',
        logoUrl: '',
        address: data.address?.trim() || 'Madagascar',
        phone: data.phone?.trim() || '',
        email: data.email?.trim() || '',
        website: '',
        directorName: cleanDirectorName,
        directorTitle: data.directorTitle?.trim() || "Le Directeur de l'Établissement",
        directorSignatureUrl: '',
        schoolStampUrl: '',
        activeAcademicYear: '2025-2026',
        academicYears: ['2025-2026', '2026-2027'],
        maxGrade: 20,
        availableTerms: [
          { id: 'T1', name: '1er Trimestre', shortName: 'Trimestre 1', isLocked: false },
          { id: 'T2', name: '2ème Trimestre', shortName: 'Trimestre 2', isLocked: false },
          { id: 'T3', name: '3ème Trimestre', shortName: 'Trimestre 3', isLocked: false },
        ],
        isDemoData: false,
      },
      adminAuth: {
        pinHash: simpleHash(data.pin.trim()),
        isConfigured: true,
        recoveryQuestion: data.recoveryQuestion.trim(),
        recoveryAnswerHash: simpleHash(data.recoveryAnswer.trim().toLowerCase()),
        lastLogin: new Date().toISOString(),
      },
      classes: [], // EMPTY: No classes
      subjects: [], // EMPTY: No subjects
      teachers: [], // EMPTY: No teachers
      students: [], // EMPTY: No students
      grades: [],
      gradeAudits: [],
      studentAttendances: [],
      teacherAttendances: [],
      reportCardValidations: [],
      activityLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userName: cleanDirectorName,
          userRole: 'DIRECTEUR',
          action: 'INSCRIPTION_ETABLISSEMENT',
          details: `Fisoratana anarana ofisialy sy famoronana ny sekoly ${cleanSchoolName}. Tsy misy mpianatra na mpampianatra aloha (vide). Ny Tale no hampiditra kilasy, taranja, mpampianatra ary mpianatra.`,
        },
      ],
    };

    const schoolPayload = {
      id: newSchoolId,
      schoolName: cleanSchoolName,
      directorName: cleanDirectorName,
      phone: data.phone?.trim() || '',
      address: data.address?.trim() || '',
      email: data.email?.trim() || '',
      isDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      database: emptySchoolDb,
    };

    // 1. Save directly to Firestore under /schools/{newSchoolId}
    if (typeof window !== 'undefined') {
      try {
        const schoolDocRef = doc(firestore, 'schools', newSchoolId);
        await setDoc(schoolDocRef, schoolPayload);
      } catch (err) {
        console.error('Error writing new school to Firestore:', err);
      }
    }

    // Cache to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(`school_db_${newSchoolId}`, JSON.stringify(emptySchoolDb));
    }

    // 2. Switch active school to this newly registered school
    await this.switchActiveSchool(newSchoolId);

    return {
      schoolId: newSchoolId,
      schoolName: cleanSchoolName,
      directorName: cleanDirectorName,
    };
  }

  public async importStandardMalagasySubjects(user: string = 'Directeur'): Promise<number> {
    const db = await this.getDatabase();
    if (db.subjects.length > 0) return 0;

    const standardSubjects: Subject[] = [
      { id: 'sub-mlg', name: 'Malagasy', code: 'MLG', defaultCoefficient: 3, classCoefficients: {}, displayOrder: 1, category: 'Littéraire', isArchived: false },
      { id: 'sub-fr', name: 'Français', code: 'FR', defaultCoefficient: 3, classCoefficients: {}, displayOrder: 2, category: 'Littéraire', isArchived: false },
      { id: 'sub-ang', name: 'Anglais', code: 'ANG', defaultCoefficient: 2, classCoefficients: {}, displayOrder: 3, category: 'Langues', isArchived: false },
      { id: 'sub-math', name: 'Mathématiques', code: 'MATH', defaultCoefficient: 4, classCoefficients: {}, displayOrder: 4, category: 'Scientifique', isArchived: false },
      { id: 'sub-pc', name: 'Sciences Physiques & Chimie', code: 'PC', defaultCoefficient: 3, classCoefficients: {}, displayOrder: 5, category: 'Scientifique', isArchived: false },
      { id: 'sub-svt', name: 'Sciences de la Vie et de la Terre (SVT)', code: 'SVT', defaultCoefficient: 3, classCoefficients: {}, displayOrder: 6, category: 'Scientifique', isArchived: false },
      { id: 'sub-hg', name: 'Histoire - Géographie & Éduc. Civique', code: 'HG', defaultCoefficient: 2, classCoefficients: {}, displayOrder: 7, category: 'Littéraire', isArchived: false },
      { id: 'sub-eps', name: 'Éducation Physique et Sportive (EPS)', code: 'EPS', defaultCoefficient: 2, classCoefficients: {}, displayOrder: 8, category: 'Sport', isArchived: false },
      { id: 'sub-philo', name: 'Philosophie', code: 'PHILO', defaultCoefficient: 2, classCoefficients: {}, displayOrder: 9, category: 'Littéraire', isArchived: false },
      { id: 'sub-info', name: 'Informatique & TIC', code: 'INFO', defaultCoefficient: 1, classCoefficients: {}, displayOrder: 10, category: 'Scientifique', isArchived: false },
    ];

    db.subjects = standardSubjects;
    this.persist(db);
    await this.logActivity(
      user,
      'DIRECTEUR',
      'IMPORT_TARANJA',
      'Fampidirana ny lisitry ny taranja fototra mahazatra (Programme National Malagasy).'
    );
    return standardSubjects.length;
  }

  public async verifyTeacherCredentials(nameEmailOrMatricule: string, pass: string): Promise<Teacher | null> {
    const db = await this.getDatabase();
    const cleanSearch = nameEmailOrMatricule.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!cleanSearch) return null;

    const teacher = db.teachers.find((t) => {
      if (t.status !== 'active') return false;
      const fn = (t.firstName || '').toLowerCase().trim();
      const ln = (t.lastName || '').toLowerCase().trim();
      const fullName1 = `${fn} ${ln}`.replace(/\s+/g, ' ');
      const fullName2 = `${ln} ${fn}`.replace(/\s+/g, ' ');
      const email = (t.email || '').toLowerCase().trim();
      const matricule = (t.matricule || '').toLowerCase().trim();

      return (
        t.id === cleanSearch ||
        email === cleanSearch ||
        matricule === cleanSearch ||
        fullName1 === cleanSearch ||
        fullName2 === cleanSearch ||
        ln === cleanSearch ||
        fn === cleanSearch
      );
    });

    if (!teacher) return null;
    if (teacher.passwordHash === simpleHash(pass)) {
      return teacher;
    }
    return null;
  }

  // --- CLASSES ---
  public async addClass(newClass: Omit<ClassRoom, 'id' | 'createdAt'>, user: string): Promise<ClassRoom> {
    const db = await this.getDatabase();
    const created: ClassRoom = {
      ...newClass,
      id: `cls-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    db.classes.push(created);
    this.persist(db);
    await this.logActivity(user, 'DIRECTEUR', 'AJOUT_CLASSE', `Création de la classe "${created.name}".`);
    return created;
  }

  public async updateClass(classRoom: ClassRoom, user: string): Promise<void> {
    const db = await this.getDatabase();
    db.classes = db.classes.map((c) => (c.id === classRoom.id ? classRoom : c));
    this.persist(db);
    await this.logActivity(user, 'DIRECTEUR', 'MODIF_CLASSE', `Modification de la classe "${classRoom.name}".`);
  }

  public async toggleClassArchive(classId: string, archive: boolean, user: string): Promise<void> {
    const db = await this.getDatabase();
    const cls = db.classes.find((c) => c.id === classId);
    if (!cls) return;
    cls.isArchived = archive;
    this.persist(db);
    await this.logActivity(
      user,
      'DIRECTEUR',
      archive ? 'ARCHIVAGE_CLASSE' : 'RESTAURATION_CLASSE',
      `${archive ? 'Archivage' : 'Restauration'} de la classe "${cls.name}".`
    );
  }

  // --- STUDENTS ---
  public async addStudent(studentData: Omit<Student, 'id' | 'matricule'>, user: string): Promise<Student> {
    const db = await this.getDatabase();
    const year = db.settings.activeAcademicYear.split('-')[0] || '2026';
    const count = db.students.length + 1;
    const matricule = `ELEV-${year}-${String(count).padStart(3, '0')}`;
    const student: Student = {
      ...studentData,
      id: `stu-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      matricule,
    };
    db.students.push(student);
    this.persist(db);
    await this.logActivity(
      user,
      'DIRECTEUR',
      'AJOUT_ÉLÈVE',
      `Inscription de l'élève ${student.lastName} ${student.firstName} (${matricule}).`
    );
    return student;
  }

  public async updateStudent(student: Student, user: string): Promise<void> {
    const db = await this.getDatabase();
    db.students = db.students.map((s) => (s.id === student.id ? student : s));
    this.persist(db);
    await this.logActivity(
      user,
      'DIRECTEUR',
      'MODIF_ÉLÈVE',
      `Mise à jour du dossier élève : ${student.lastName} ${student.firstName} (${student.matricule}).`
    );
  }

  public async toggleStudentArchive(studentId: string, archive: boolean, user: string): Promise<void> {
    const db = await this.getDatabase();
    const s = db.students.find((stu) => stu.id === studentId);
    if (!s) return;
    s.status = archive ? 'archived' : 'active';
    this.persist(db);
    await this.logActivity(
      user,
      'DIRECTEUR',
      archive ? 'ARCHIVAGE_ÉLÈVE' : 'RESTAURATION_ÉLÈVE',
      `${archive ? 'Archivage' : 'Restauration'} de l'élève ${s.lastName} ${s.firstName}.`
    );
  }

  public async importStudentsBatch(studentsList: Array<Partial<Student>>, user: string): Promise<number> {
    const db = await this.getDatabase();
    const year = db.settings.activeAcademicYear.split('-')[0] || '2026';
    let addedCount = 0;

    for (const item of studentsList) {
      if (!item.lastName || !item.firstName || !item.classId) continue;
      const count = db.students.length + 1;
      const matricule = item.matricule || `ELEV-${year}-${String(count).padStart(3, '0')}`;
      const newStudent: Student = {
        id: `stu-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        matricule,
        firstName: item.firstName,
        lastName: item.lastName.toUpperCase(),
        birthDate: item.birthDate || '2012-01-01',
        gender: item.gender === 'F' ? 'F' : 'M',
        address: item.address || 'Non spécifiée',
        fatherName: item.fatherName || '',
        motherName: item.motherName || '',
        guardianPhone: item.guardianPhone || '',
        classId: item.classId,
        academicYear: db.settings.activeAcademicYear,
        status: 'active',
        admissionDate: new Date().toISOString().split('T')[0],
      };
      db.students.push(newStudent);
      addedCount++;
    }
    this.persist(db);
    await this.logActivity(user, 'DIRECTEUR', 'IMPORT_ÉLÈVES', `Importation groupée de ${addedCount} élèves.`);
    return addedCount;
  }

  // --- TEACHERS ---
  public async addTeacher(
    teacherData: Omit<Teacher, 'id' | 'matricule' | 'passwordHash'> & { initialPassword?: string },
    user: string
  ): Promise<Teacher> {
    const db = await this.getDatabase();
    const count = db.teachers.length + 1;
    const matricule = `ENS-2026-${String(count).padStart(3, '0')}`;
    const teacher: Teacher = {
      ...teacherData,
      id: `tch-${Date.now()}`,
      matricule,
      passwordHash: simpleHash(teacherData.initialPassword || 'prof123'),
      createdAt: new Date().toISOString(),
    };
    db.teachers.push(teacher);
    this.persist(db);
    await this.logActivity(
      user,
      'DIRECTEUR',
      'AJOUT_ENSEIGNANT',
      `Ajout de l'enseignant ${teacher.lastName} ${teacher.firstName} (${matricule}).`
    );
    return teacher;
  }

  public async updateTeacher(teacher: Teacher, user: string): Promise<void> {
    const db = await this.getDatabase();
    db.teachers = db.teachers.map((t) => (t.id === teacher.id ? teacher : t));
    this.persist(db);
    await this.logActivity(
      user,
      'DIRECTEUR',
      'MODIF_ENSEIGNANT',
      `Mise à jour du profil enseignant de ${teacher.lastName} ${teacher.firstName}.`
    );
  }

  public async updateTeacherPassword(teacherId: string, newPass: string, user: string): Promise<void> {
    const db = await this.getDatabase();
    const t = db.teachers.find((tea) => tea.id === teacherId);
    if (!t) return;
    t.passwordHash = simpleHash(newPass);
    this.persist(db);
    await this.logActivity(
      user,
      'DIRECTEUR',
      'MOT_DE_PASSE_ENSEIGNANT',
      `Mise à jour du mot de passe de l'enseignant ${t.lastName} ${t.firstName}.`
    );
  }

  public async toggleTeacherArchive(teacherId: string, archive: boolean, user: string): Promise<void> {
    const db = await this.getDatabase();
    const t = db.teachers.find((tea) => tea.id === teacherId);
    if (!t) return;
    t.status = archive ? 'archived' : 'active';
    this.persist(db);
    await this.logActivity(
      user,
      'DIRECTEUR',
      archive ? 'ARCHIVAGE_ENSEIGNANT' : 'RESTAURATION_ENSEIGNANT',
      `${archive ? 'Archivage' : 'Restauration'} de l'enseignant ${t.lastName} ${t.firstName}.`
    );
  }

  // --- SUBJECTS & COEFFICIENTS ---
  public async addSubject(subjectData: Omit<Subject, 'id'>, user: string): Promise<Subject> {
    const db = await this.getDatabase();
    const subject: Subject = {
      ...subjectData,
      id: `sub-${Date.now()}`,
    };
    db.subjects.push(subject);
    this.persist(db);
    await this.logActivity(user, 'DIRECTEUR', 'AJOUT_MATIÈRE', `Création de la matière "${subject.name}" (Code: ${subject.code}).`);
    return subject;
  }

  public async updateSubject(subject: Subject, user: string): Promise<void> {
    const db = await this.getDatabase();
    db.subjects = db.subjects.map((s) => (s.id === subject.id ? subject : s));
    
    // Automatically update coefficient in db.grades for this subject to keep calculations accurate
    if (db.grades && db.grades.length > 0) {
      db.grades = db.grades.map((g) => {
        if (g.subjectId === subject.id) {
          const coeff = subject.classCoefficients?.[g.classId] || subject.defaultCoefficient || 1;
          return { ...g, coefficient: coeff };
        }
        return g;
      });
    }

    this.persist(db);
    await this.logActivity(user, 'DIRECTEUR', 'MODIF_MATIÈRE', `Modification de la matière "${subject.name}" (Coefficient: ${subject.defaultCoefficient}).`);
  }

  public async updateSubjectCoefficient(
    subjectId: string,
    defaultCoefficient: number,
    classCoefficients?: Record<string, number>,
    user: string = 'Directeur'
  ): Promise<void> {
    const db = await this.getDatabase();
    const subject = db.subjects.find((s) => s.id === subjectId);
    if (!subject) return;

    subject.defaultCoefficient = defaultCoefficient;
    if (classCoefficients !== undefined) {
      subject.classCoefficients = classCoefficients;
    }

    // Synchronize grades
    if (db.grades && db.grades.length > 0) {
      db.grades = db.grades.map((g) => {
        if (g.subjectId === subject.id) {
          const coeff = subject.classCoefficients?.[g.classId] || subject.defaultCoefficient || 1;
          return { ...g, coefficient: coeff };
        }
        return g;
      });
    }

    this.persist(db);
    await this.logActivity(
      user,
      'DIRECTEUR',
      'MODIF_COEFFICIENT',
      `Fanovana coefficient ho an'ny taranja "${subject.name}" ho ${defaultCoefficient}.`
    );
  }

  public async toggleSubjectArchive(subjectId: string, archive: boolean, user: string): Promise<void> {
    const db = await this.getDatabase();
    const s = db.subjects.find((sub) => sub.id === subjectId);
    if (!s) return;
    s.isArchived = archive;
    this.persist(db);
    await this.logActivity(
      user,
      'DIRECTEUR',
      archive ? 'ARCHIVAGE_MATIÈRE' : 'RESTAURATION_MATIÈRE',
      `${archive ? 'Archivage' : 'Restauration'} de la matière "${s.name}".`
    );
  }

  // --- GRADES & AUDIT ---
  public async saveBatchGrades(
    classId: string,
    subjectId: string,
    termId: string,
    academicYear: string,
    entries: Array<{
      studentId: string;
      score: number | null;
      observation?: string;
      isAbsent?: boolean;
      signatureUrl?: string;
      signedAt?: string;
    }>,
    user: string,
    userRole: 'DIRECTEUR' | 'ENSEIGNANT',
    teacherId?: string
  ): Promise<void> {
    const db = this.getDatabase();
    const subject = db.subjects.find((s) => s.id === subjectId);
    const coefficient = subject?.classCoefficients?.[classId] || subject?.defaultCoefficient || 1;
    const now = new Date().toISOString();

    for (const item of entries) {
      const existingIndex = db.grades.findIndex(
        (g) =>
          g.studentId === item.studentId &&
          g.subjectId === subjectId &&
          g.termId === termId &&
          g.academicYear === academicYear
      );

      const student = db.students.find((s) => s.id === item.studentId);
      const studentName = student ? `${student.lastName} ${student.firstName}` : 'Élève';

      if (existingIndex >= 0) {
        const old = db.grades[existingIndex];
        if (old.score !== item.score) {
          // Log audit
          db.gradeAudits.unshift({
            id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            gradeId: old.id,
            studentId: item.studentId,
            studentName,
            subjectName: subject?.name || 'Matière',
            oldScore: old.score,
            newScore: item.score,
            modifiedBy: user,
            userRole,
            timestamp: now,
            reason: item.observation || 'Mise à jour de note',
          });
        }
        db.grades[existingIndex] = {
          ...old,
          score: item.score,
          coefficient,
          isAbsent: item.isAbsent,
          observation: item.observation,
          teacherId: teacherId || old.teacherId,
          teacherName: user,
          signatureUrl: item.signatureUrl !== undefined ? item.signatureUrl : old.signatureUrl,
          signedAt: item.signatureUrl ? (item.signedAt || now) : (item.signatureUrl === '' ? undefined : old.signedAt),
          updatedAt: now,
        };
      } else {
        const newGrade: GradeEntry = {
          id: `grd-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          studentId: item.studentId,
          classId,
          subjectId,
          termId,
          academicYear,
          score: item.score,
          coefficient,
          isAbsent: item.isAbsent,
          observation: item.observation,
          teacherId,
          teacherName: user,
          signatureUrl: item.signatureUrl,
          signedAt: item.signatureUrl ? (item.signedAt || now) : undefined,
          updatedAt: now,
        };
        db.grades.push(newGrade);
      }
    }

    this.persist(db);
    await this.logActivity(
      user,
      userRole,
      'SAISIE_NOTES',
      `Saisie/mise à jour de ${entries.length} notes avec signatures pour ${subject?.name || 'la matière'} en classe.`
    );
  }

  public async toggleTermLock(termId: string, isLocked: boolean, user: string): Promise<void> {
    const db = await this.getDatabase();
    const term = db.settings.availableTerms.find((t) => t.id === termId);
    if (!term) return;
    term.isLocked = isLocked;
    this.persist(db);
    await this.logActivity(
      user,
      'DIRECTEUR',
      isLocked ? 'VERROUILLAGE_NOTES' : 'DÉVERROUILLAGE_NOTES',
      `${isLocked ? 'Verrouillage de la saisie des notes' : 'Ouverture de la saisie des notes'} pour le ${term.name}.`
    );
  }

  // --- ATTENDANCE ---
  public async recordStudentAttendances(
    attendances: Array<Omit<StudentAttendance, 'id'>>,
    user: string
  ): Promise<void> {
    const db = await this.getDatabase();
    for (const item of attendances) {
      // Check if entry already exists for student, date, class
      const existingIdx = db.studentAttendances.findIndex(
        (a) => a.studentId === item.studentId && a.date === item.date && a.classId === item.classId
      );
      if (existingIdx >= 0) {
        db.studentAttendances[existingIdx] = {
          ...db.studentAttendances[existingIdx],
          ...item,
          recordedBy: user,
        };
      } else {
        db.studentAttendances.push({
          ...item,
          id: `att-s-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          recordedBy: user,
        });
      }
    }
    this.persist(db);
    await this.logActivity(
      user,
      'DIRECTEUR',
      'PRÉSENCES_ÉLÈVES',
      `Enregistrement de la fiche d'appel des élèves (${attendances.length} élèves).`
    );
  }

  public async recordTeacherAttendance(
    attendance: Omit<TeacherAttendance, 'id'>,
    user: string
  ): Promise<void> {
    const db = await this.getDatabase();
    const existingIdx = db.teacherAttendances.findIndex(
      (a) => a.teacherId === attendance.teacherId && a.date === attendance.date
    );
    if (existingIdx >= 0) {
      db.teacherAttendances[existingIdx] = {
        ...db.teacherAttendances[existingIdx],
        ...attendance,
        recordedBy: user,
      };
    } else {
      db.teacherAttendances.push({
        ...attendance,
        id: `att-t-${Date.now()}`,
        recordedBy: user,
      });
    }
    this.persist(db);
    await this.logActivity(
      user,
      'DIRECTEUR',
      'PRÉSENCE_ENSEIGNANT',
      `Pointage présence enseignant pour le ${attendance.date}.`
    );
  }

  // --- REPORT CARDS / BULLETINS ---
  public async validateReportCard(validation: ReportCardValidation, user: string): Promise<void> {
    const db = await this.getDatabase();
    const idx = db.reportCardValidations.findIndex((v) => v.id === validation.id);
    if (idx >= 0) {
      db.reportCardValidations[idx] = validation;
    } else {
      db.reportCardValidations.push(validation);
    }
    this.persist(db);
    const stu = db.students.find((s) => s.id === validation.studentId);
    await this.logActivity(
      user,
      'DIRECTEUR',
      'VALIDATION_BULLETIN',
      `Validation officielle et signature du bulletin de ${stu ? `${stu.lastName} ${stu.firstName}` : 'l\'élève'} (${validation.termId}).`
    );
  }

  // --- ACADEMIC COMPUTATIONS ---
  public calculateStudentReport(
    studentId: string,
    classId: string,
    termId: string,
    academicYear: string,
    db: SchoolDatabase
  ) {
    const classRoom = db.classes.find((c) => c.id === classId);
    const activeSubjects = db.subjects
      .filter((s) => !s.isArchived)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    const grades = db.grades.filter(
      (g) =>
        g.studentId === studentId &&
        g.classId === classId &&
        g.termId === termId &&
        g.academicYear === academicYear
    );

    let totalPoints = 0;
    let totalCoefficients = 0;
    let totalEvaluatedSubjects = 0;

    const subjectRows = activeSubjects.map((subject) => {
      const coeff = subject.classCoefficients?.[classId] || subject.defaultCoefficient || 1;
      const grade = grades.find((g) => g.subjectId === subject.id);

      const hasScore = grade && grade.score !== null && grade.score !== undefined && !grade.isAbsent;
      const score = hasScore ? (grade?.score as number) : null;
      const totalSubjectPoints = score !== null ? Number((score * coeff).toFixed(2)) : null;

      if (score !== null) {
        totalPoints += totalSubjectPoints!;
        totalCoefficients += coeff;
        totalEvaluatedSubjects++;
      }

      // Compute class average for this subject
      const allClassScores = db.grades
        .filter(
          (g) =>
            g.classId === classId &&
            g.subjectId === subject.id &&
            g.termId === termId &&
            g.academicYear === academicYear &&
            g.score !== null &&
            !g.isAbsent
        )
        .map((g) => g.score as number);

      const classSubjectAverage =
        allClassScores.length > 0
          ? Number(
              (allClassScores.reduce((sum, val) => sum + val, 0) / allClassScores.length).toFixed(2)
            )
          : null;

      const assignedTeacher = db.teachers.find(
        (t) =>
          t.status === 'active' &&
          t.assignedClassIds.includes(classId) &&
          t.assignedSubjectIds.includes(subject.id)
      );

      return {
        subject,
        coefficient: coeff,
        score,
        isAbsent: Boolean(grade?.isAbsent),
        totalSubjectPoints,
        classSubjectAverage,
        observation: grade?.observation || '',
        teacherName:
          grade?.teacherName ||
          (assignedTeacher ? `Prof. ${assignedTeacher.firstName} ${assignedTeacher.lastName}` : ''),
        signatureUrl:
          grade?.signatureUrl ||
          (hasScore && assignedTeacher?.signatureUrl ? assignedTeacher.signatureUrl : undefined),
        signedAt: grade?.signedAt,
      };
    });

    const generalAverage =
      totalCoefficients > 0 ? Number((totalPoints / totalCoefficients).toFixed(2)) : null;

    // Calculate rank in class
    const classStudents = db.students.filter(
      (s) => s.classId === classId && s.status === 'active'
    );

    const studentAverages = classStudents.map((s) => {
      const sGrades = db.grades.filter(
        (g) =>
          g.studentId === s.id &&
          g.classId === classId &&
          g.termId === termId &&
          g.academicYear === academicYear &&
          g.score !== null &&
          !g.isAbsent
      );
      let sPoints = 0;
      let sCoeff = 0;
      sGrades.forEach((g) => {
        const sub = db.subjects.find((sub) => sub.id === g.subjectId);
        const c = sub?.classCoefficients?.[classId] || sub?.defaultCoefficient || 1;
        sPoints += (g.score || 0) * c;
        sCoeff += c;
      });
      const avg = sCoeff > 0 ? Number((sPoints / sCoeff).toFixed(2)) : -1;
      return { studentId: s.id, average: avg };
    });

    studentAverages.sort((a, b) => b.average - a.average);

    const rankIndex = studentAverages.findIndex((item) => item.studentId === studentId);
    const rank = rankIndex >= 0 && studentAverages[rankIndex].average >= 0 ? rankIndex + 1 : null;

    const validAverages = studentAverages.filter((item) => item.average >= 0).map((i) => i.average);
    const classGeneralAverage =
      validAverages.length > 0
        ? Number((validAverages.reduce((sum, v) => sum + v, 0) / validAverages.length).toFixed(2))
        : null;

    return {
      classRoom,
      subjectRows,
      totalPoints: Number(totalPoints.toFixed(2)),
      totalCoefficients,
      totalEvaluatedSubjects,
      generalAverage,
      rank,
      classSize: classStudents.length,
      classGeneralAverage,
    };
  }
}

export const dbService = new DatabaseService();
