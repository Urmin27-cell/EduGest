import React, { useState, useEffect } from 'react';
import { SchoolDatabase, Student } from './types';
import { dbService } from './services/dbService';
import { AuthView } from './components/AuthView';
import { Layout } from './components/Layout';
import { DirectorDashboardView } from './components/DirectorDashboardView';
import { TeacherDashboardView } from './components/TeacherDashboardView';
import { StudentsListView } from './components/StudentsListView';
import { TeachersListView } from './components/TeachersListView';
import { ClassesListView } from './components/ClassesListView';
import { SubjectsListView } from './components/SubjectsListView';
import { GradeEntryView } from './components/GradeEntryView';
import { BulletinsHubView } from './components/BulletinsHubView';
import { StudentAttendanceView } from './components/StudentAttendanceView';
import { TeacherAttendanceView } from './components/TeacherAttendanceView';
import { StatsView } from './components/StatsView';
import { AuditLogView } from './components/AuditLogView';
import { SettingsView } from './components/SettingsView';
import { StudentProfileModal } from './components/StudentProfileModal';
import { StudentModal } from './components/StudentModal';

export default function App() {
  const [db, setDb] = useState<SchoolDatabase>(dbService.getDatabase());
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    role: 'DIRECTEUR' | 'ENSEIGNANT';
    teacherId?: string;
  } | null>(() => {
    // Check session storage
    const saved = sessionStorage.getItem('ecole_session_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [currentSection, setCurrentSection] = useState<string>(() => {
    const saved = sessionStorage.getItem('ecole_session_user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u.role === 'ENSEIGNANT') return 'grades';
      } catch {
        return 'dashboard';
      }
    }
    return 'dashboard';
  });

  // Pre-selected parameters for bulletin jump
  const [bulletinTarget, setBulletinTarget] = useState<{
    studentId?: string;
    termId?: string;
  }>({});

  // Quick student modal state
  const [isQuickStudentModalOpen, setIsQuickStudentModalOpen] = useState(false);
  const [profileModalStudent, setProfileModalStudent] = useState<Student | null>(null);

  // Subscribe to reactive database changes
  useEffect(() => {
    const unsubscribe = dbService.subscribe((updatedDb) => {
      setDb(updatedDb);
    });
    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (user: {
    name: string;
    role: 'DIRECTEUR' | 'ENSEIGNANT';
    teacherId?: string;
  }) => {
    setCurrentUser(user);
    sessionStorage.setItem('ecole_session_user', JSON.stringify(user));
    if (user.role === 'ENSEIGNANT') {
      setCurrentSection('grades');
    } else {
      setCurrentSection('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('ecole_session_user');
    setBulletinTarget({});
  };

  const handleNavigateToBulletin = (student: Student, termId: string) => {
    setBulletinTarget({ studentId: student.id, termId });
    setCurrentSection('bulletins');
  };

  const handleQuickStudentCreated = async (data: any) => {
    if (!currentUser) return;
    await dbService.createStudent(data, currentUser.name);
  };

  if (!currentUser) {
    return <AuthView db={db} onSuccess={handleLoginSuccess} />;
  }

  return (
    <Layout
      db={db}
      currentUser={currentUser}
      currentSection={currentSection}
      onNavigate={(sec) => {
        // Enseignants are strictly restricted to grades entry and signature
        if (currentUser.role === 'ENSEIGNANT' && sec !== 'grades') {
          setCurrentSection('grades');
          return;
        }
        // If navigating to bulletins directly, reset specific target so user has full control
        if (sec === 'bulletins' && currentSection !== 'bulletins') {
          setBulletinTarget({});
        }
        setCurrentSection(sec);
      }}
      onLogout={handleLogout}
      onSelectStudentProfile={(stu) => setProfileModalStudent(stu)}
    >
      {/* Content Router */}
      {currentSection === 'dashboard' && (
        <>
          {currentUser.role === 'DIRECTEUR' ? (
            <DirectorDashboardView
              db={db}
              onNavigate={setCurrentSection}
              onQuickStudent={() => setIsQuickStudentModalOpen(true)}
            />
          ) : (
            <TeacherDashboardView
              db={db}
              teacherId={currentUser.teacherId || ''}
              onNavigate={setCurrentSection}
            />
          )}
        </>
      )}

      {currentSection === 'students' && (
        <StudentsListView
          db={db}
          currentUser={currentUser}
          onNavigateToBulletin={handleNavigateToBulletin}
          onUpdate={() => setDb(dbService.getDatabase())}
        />
      )}

      {currentSection === 'teachers' && (
        <>
          {currentUser.role === 'DIRECTEUR' ? (
            <TeachersListView
              db={db}
              currentUser={currentUser}
              onUpdate={() => setDb(dbService.getDatabase())}
            />
          ) : (
            <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
              Accès réservé à la Direction de l'établissement.
            </div>
          )}
        </>
      )}

      {currentSection === 'classes' && (
        <ClassesListView
          db={db}
          currentUser={currentUser}
          onSelectClassForStudents={(clsId) => {
            setCurrentSection('students');
          }}
          onUpdate={() => setDb(dbService.getDatabase())}
        />
      )}

      {currentSection === 'subjects' && (
        <SubjectsListView
          db={db}
          currentUser={currentUser}
          onUpdate={() => setDb(dbService.getDatabase())}
        />
      )}

      {currentSection === 'grades' && (
        <GradeEntryView
          db={db}
          currentUser={currentUser}
          onUpdate={() => setDb(dbService.getDatabase())}
        />
      )}

      {currentSection === 'bulletins' && (
        <BulletinsHubView
          key={bulletinTarget.studentId || 'default-hub'}
          db={db}
          currentUser={currentUser}
          initialStudentId={bulletinTarget.studentId}
          initialTermId={bulletinTarget.termId}
          onUpdate={() => setDb(dbService.getDatabase())}
        />
      )}

      {currentSection === 'attendance-students' && (
        <StudentAttendanceView
          db={db}
          currentUser={currentUser}
          onUpdate={() => setDb(dbService.getDatabase())}
        />
      )}

      {currentSection === 'attendance-teachers' && (
        <>
          {currentUser.role === 'DIRECTEUR' ? (
            <TeacherAttendanceView
              db={db}
              currentUser={currentUser}
              onUpdate={() => setDb(dbService.getDatabase())}
            />
          ) : (
            <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
              Accès réservé à la Direction de l'établissement.
            </div>
          )}
        </>
      )}

      {currentSection === 'stats' && <StatsView db={db} />}

      {currentSection === 'audit' && <AuditLogView db={db} />}

      {currentSection === 'settings' && (
        <>
          {currentUser.role === 'DIRECTEUR' ? (
            <SettingsView
              db={db}
              currentUser={currentUser}
              onUpdate={() => setDb(dbService.getDatabase())}
            />
          ) : (
            <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
              Accès réservé à la Direction de l'établissement.
            </div>
          )}
        </>
      )}

      {/* Quick Inscribe Student Modal */}
      <StudentModal
        isOpen={isQuickStudentModalOpen}
        onClose={() => setIsQuickStudentModalOpen(false)}
        onSave={handleQuickStudentCreated}
        classes={db.classes.filter((c) => !c.isArchived)}
        academicYear={db.settings.activeAcademicYear}
      />

      {/* Global Student Profile Modal */}
      <StudentProfileModal
        isOpen={Boolean(profileModalStudent)}
        onClose={() => setProfileModalStudent(null)}
        student={profileModalStudent}
        classes={db.classes}
        db={db}
        onOpenBulletin={(stu, termId) => {
          setProfileModalStudent(null);
          handleNavigateToBulletin(stu, termId);
        }}
      />
    </Layout>
  );
}
