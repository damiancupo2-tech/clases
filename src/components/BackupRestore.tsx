import React, { useState } from 'react';
import { Download, Upload, AlertCircle, CheckCircle, Database, Shield } from 'lucide-react';
import { collection, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';

interface BackupRestoreProps {
  clubId: string;
  clubName: string;
}

interface BackupData {
  version: string;
  exportDate: string;
  clubId: string;
  clubName: string;
  students: any[];
  classes: any[];
  transactions: any[];
  receipts: any[];
  metadata: {
    totalStudents: number;
    totalClasses: number;
    totalTransactions: number;
    totalReceipts: number;
  };
}

export function BackupRestore({ clubId, clubName }: BackupRestoreProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [restoreMode, setRestoreMode] = useState(false);

  const exportBackup = async () => {
    setLoading(true);
    setStatus({ type: 'info', message: 'Exportando datos...' });

    try {
      const backupData: BackupData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        clubId: clubId,
        clubName: clubName,
        students: [],
        classes: [],
        transactions: [],
        receipts: [],
        metadata: {
          totalStudents: 0,
          totalClasses: 0,
          totalTransactions: 0,
          totalReceipts: 0
        }
      };

      const studentsSnapshot = await getDocs(collection(db, 'clubs', clubId, 'students'));
      backupData.students = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()?.toISOString() || null,
        updatedAt: doc.data().updatedAt?.toDate()?.toISOString() || null
      }));

      const classesSnapshot = await getDocs(collection(db, 'clubs', clubId, 'classes'));
      backupData.classes = classesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate()?.toISOString() || null,
        createdAt: doc.data().createdAt?.toDate()?.toISOString() || null
      }));

      const transactionsSnapshot = await getDocs(collection(db, 'clubs', clubId, 'transactions'));
      backupData.transactions = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate()?.toISOString() || null,
        createdAt: doc.data().createdAt?.toDate()?.toISOString() || null
      }));

      const receiptsSnapshot = await getDocs(collection(db, 'clubs', clubId, 'receipts'));
      backupData.receipts = receiptsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate()?.toISOString() || null,
        createdAt: doc.data().createdAt?.toDate()?.toISOString() || null
      }));

      backupData.metadata = {
        totalStudents: backupData.students.length,
        totalClasses: backupData.classes.length,
        totalTransactions: backupData.transactions.length,
        totalReceipts: backupData.receipts.length
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${clubName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus({
        type: 'success',
        message: `Backup exportado exitosamente! ${backupData.metadata.totalStudents} alumnos, ${backupData.metadata.totalClasses} clases, ${backupData.metadata.totalTransactions} transacciones, ${backupData.metadata.totalReceipts} recibos.`
      });
    } catch (error) {
      console.error('Error al exportar backup:', error);
      setStatus({
        type: 'error',
        message: 'Error al exportar el backup. Por favor intenta de nuevo.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus({ type: 'info', message: 'Leyendo archivo de backup...' });

    try {
      const text = await file.text();
      const backupData: BackupData = JSON.parse(text);

      if (!backupData.version || !backupData.students || !backupData.classes) {
        throw new Error('Formato de backup inválido');
      }

      setStatus({ type: 'info', message: 'Restaurando datos...' });

      let batch = writeBatch(db);
      let batchCount = 0;
      const maxBatchSize = 500;
      let restoredCounts = {
        students: 0,
        classes: 0,
        transactions: 0,
        receipts: 0
      };

      const commitBatch = async () => {
        if (batchCount > 0) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      };

      for (const student of backupData.students) {
        if (!student.name || !student.id) {
          console.warn('Alumno inválido, omitiendo:', student);
          continue;
        }

        restoredCounts.students++;

        const { id, ...studentData } = student;
        const studentRef = doc(db, 'clubs', clubId, 'students', id);

        const processedData = {
          ...studentData,
          createdAt: studentData.createdAt ? new Date(studentData.createdAt) : new Date(),
          updatedAt: studentData.updatedAt ? new Date(studentData.updatedAt) : new Date()
        };

        batch.set(studentRef, processedData);
        batchCount++;

        if (batchCount >= maxBatchSize) {
          await commitBatch();
        }
      }

      for (const classItem of backupData.classes) {
        if (!classItem.id || !classItem.type || !classItem.date) {
          console.warn('Clase inválida, omitiendo:', classItem);
          continue;
        }

        restoredCounts.classes++;

        const { id, ...classData } = classItem;
        const classRef = doc(db, 'clubs', clubId, 'classes', id);

        const processedData = {
          ...classData,
          date: classData.date ? new Date(classData.date) : new Date(),
          createdAt: classData.createdAt ? new Date(classData.createdAt) : new Date()
        };

        batch.set(classRef, processedData);
        batchCount++;

        if (batchCount >= maxBatchSize) {
          await commitBatch();
        }
      }

      for (const transaction of backupData.transactions) {
        if (!transaction.id || !transaction.studentId || !transaction.type) {
          console.warn('Transacción inválida, omitiendo:', transaction);
          continue;
        }

        restoredCounts.transactions++;

        const { id, ...transactionData } = transaction;
        const transactionRef = doc(db, 'clubs', clubId, 'transactions', id);

        const processedData = {
          ...transactionData,
          date: transactionData.date ? new Date(transactionData.date) : new Date(),
          createdAt: transactionData.createdAt ? new Date(transactionData.createdAt) : new Date()
        };

        batch.set(transactionRef, processedData);
        batchCount++;

        if (batchCount >= maxBatchSize) {
          await commitBatch();
        }
      }

      if (backupData.receipts) {
        for (const receipt of backupData.receipts) {
          const isValidReceipt = receipt.studentId &&
                                 receipt.studentName &&
                                 Array.isArray(receipt.transactions);

          if (!isValidReceipt) {
            console.warn('Recibo inválido o de otro sistema, omitiendo:', receipt.id);
            continue;
          }

          restoredCounts.receipts++;

          const { id, ...receiptData } = receipt;
          const receiptRef = doc(db, 'clubs', clubId, 'receipts', String(id));

          const processedData = {
            ...receiptData,
            date: receiptData.date ? new Date(receiptData.date) : new Date(),
            createdAt: receiptData.createdAt ? new Date(receiptData.createdAt) : new Date()
          };

          batch.set(receiptRef, processedData);
          batchCount++;

          if (batchCount >= maxBatchSize) {
            await commitBatch();
          }
        }
      }

      await commitBatch();

      const skippedStudents = backupData.students.length - restoredCounts.students;
      const skippedClasses = backupData.classes.length - restoredCounts.classes;
      const skippedTransactions = backupData.transactions.length - restoredCounts.transactions;
      const skippedReceipts = (backupData.receipts?.length || 0) - restoredCounts.receipts;
      const totalSkipped = skippedStudents + skippedClasses + skippedTransactions + skippedReceipts;

      let message = `¡Backup restaurado exitosamente! ${restoredCounts.students} alumnos, ${restoredCounts.classes} clases, ${restoredCounts.transactions} transacciones, ${restoredCounts.receipts} recibos restaurados.`;

      if (totalSkipped > 0) {
        message += ` Se omitieron ${totalSkipped} registros inválidos o de otro sistema.`;
      }

      message += ' Por favor recarga la página.';

      setStatus({
        type: 'success',
        message
      });

      setTimeout(() => {
        window.location.reload();
      }, 3000);

    } catch (error) {
      console.error('Error al restaurar backup:', error);
      setStatus({
        type: 'error',
        message: 'Error al restaurar el backup. Verifica que el archivo sea válido.'
      });
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex items-center space-x-3 mb-3">
          <Database className="w-8 h-8" />
          <h2 className="text-2xl font-bold">Backup y Restauración</h2>
        </div>
        <p className="text-blue-100">
          Guarda una copia completa de todos tus datos o restaura información desde un backup anterior.
        </p>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p className="font-semibold mb-1">Importante:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>El backup incluye: alumnos, clases, transacciones y recibos</li>
              <li>Guarda los backups en un lugar seguro</li>
              <li>Al restaurar, los datos se agregarán al club actual</li>
              <li>Puedes restaurar backups de otros sistemas compatibles</li>
            </ul>
          </div>
        </div>
      </div>

      {status && (
        <div className={`p-4 rounded-lg border-l-4 ${
          status.type === 'success' ? 'bg-green-50 border-green-400' :
          status.type === 'error' ? 'bg-red-50 border-red-400' :
          'bg-blue-50 border-blue-400'
        }`}>
          <div className="flex items-start">
            {status.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3" />}
            {status.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />}
            {status.type === 'info' && <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />}
            <p className={`text-sm ${
              status.type === 'success' ? 'text-green-800' :
              status.type === 'error' ? 'text-red-800' :
              'text-blue-800'
            }`}>
              {status.message}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <Download className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Exportar Backup</h3>
          </div>
          <p className="text-gray-600 mb-6">
            Descarga una copia completa de todos tus datos en formato JSON. Incluye alumnos, clases, transacciones y recibos.
          </p>
          <button
            onClick={exportBackup}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>{loading ? 'Exportando...' : 'Descargar Backup'}</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Restaurar Backup</h3>
          </div>
          <p className="text-gray-600 mb-6">
            Sube un archivo de backup para restaurar información. Compatible con backups de otros sistemas.
          </p>
          <label className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50">
            <Upload className="w-5 h-5" />
            <span>{loading ? 'Restaurando...' : 'Seleccionar Archivo'}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              disabled={loading}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="w-6 h-6 text-gray-600" />
          <h3 className="text-lg font-bold text-gray-800">Información del Club Actual</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Club:</p>
            <p className="font-semibold text-gray-800">{clubName}</p>
          </div>
          <div>
            <p className="text-gray-600">ID del Club:</p>
            <p className="font-mono text-xs text-gray-800">{clubId}</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-lg font-bold text-blue-900 mb-3">¿Cómo usar esta función?</h3>
        <div className="space-y-3 text-sm text-blue-800">
          <div>
            <p className="font-semibold">1. Para hacer un backup:</p>
            <p className="ml-4">Haz clic en "Descargar Backup" y guarda el archivo JSON en un lugar seguro.</p>
          </div>
          <div>
            <p className="font-semibold">2. Para restaurar:</p>
            <p className="ml-4">Haz clic en "Seleccionar Archivo" y elige el archivo de backup que quieres restaurar.</p>
          </div>
          <div>
            <p className="font-semibold">3. Migración entre sistemas:</p>
            <p className="ml-4">Puedes usar un backup del sistema anterior y restaurarlo aquí sin problemas.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
