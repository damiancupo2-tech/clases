import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp
} from "firebase/firestore";
import { db, authReady } from "./config";
import {
  Student,
  Class,
  Transaction,
  Receipt,
  Payment,
  Invoice,
  User,
  Club
} from "../types";

// ✅ Siempre esperamos auth antes de tocar Firestore
async function ensureAuth(): Promise<void> {
  await authReady;
}

const convertDatesToTimestamp = (obj: any): any => {
  if (obj instanceof Date) {
    return Timestamp.fromDate(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(convertDatesToTimestamp);
  }
  if (obj && typeof obj === "object") {
    const converted: any = {};
    for (const key in obj) {
      converted[key] = convertDatesToTimestamp(obj[key]);
    }
    return converted;
  }
  return obj;
};

const convertTimestampsToDates = (obj: any): any => {
  if (obj instanceof Timestamp) {
    return obj.toDate();
  }
  if (Array.isArray(obj)) {
    return obj.map(convertTimestampsToDates);
  }
  if (obj && typeof obj === "object" && !(obj instanceof Timestamp)) {
    const converted: any = {};
    for (const key in obj) {
      converted[key] = convertTimestampsToDates(obj[key]);
    }
    return converted;
  }
  return obj;
};

export const firebaseService = {
  async getAllClubs(): Promise<Club[]> {
    await ensureAuth();
    const querySnapshot = await getDocs(collection(db, "clubs"));
    return querySnapshot.docs.map((d) =>
      convertTimestampsToDates({ ...d.data(), id: d.id }) as Club
    );
  },

  async getClub(id: string): Promise<Club | null> {
    await ensureAuth();
    const docRef = doc(db, "clubs", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return convertTimestampsToDates({ ...docSnap.data(), id: docSnap.id }) as Club;
    }
    return null;
  },

  async createClub(club: Omit<Club, 'id' | 'createdAt'>): Promise<string> {
    await ensureAuth();
    const clubData = {
      ...club,
      createdAt: new Date()
    };
    const docRef = doc(collection(db, "clubs"));
    await setDoc(docRef, convertDatesToTimestamp(clubData));
    return docRef.id;
  },

  async updateClub(clubId: string, updates: Partial<Omit<Club, 'id' | 'createdAt'>>): Promise<void> {
    await ensureAuth();
    const clubRef = doc(db, "clubs", clubId);
    await updateDoc(clubRef, convertDatesToTimestamp(updates));
  },

  async deleteClub(clubId: string): Promise<void> {
    await ensureAuth();
    const studentsSnapshot = await getDocs(collection(db, "clubs", clubId, "students"));
    const classesSnapshot = await getDocs(collection(db, "clubs", clubId, "classes"));
    const transactionsSnapshot = await getDocs(collection(db, "clubs", clubId, "transactions"));
    const receiptsSnapshot = await getDocs(collection(db, "clubs", clubId, "receipts"));

    const deletePromises: Promise<void>[] = [];

    studentsSnapshot.docs.forEach(d => {
      deletePromises.push(deleteDoc(d.ref));
    });
    classesSnapshot.docs.forEach(d => {
      deletePromises.push(deleteDoc(d.ref));
    });
    transactionsSnapshot.docs.forEach(d => {
      deletePromises.push(deleteDoc(d.ref));
    });
    receiptsSnapshot.docs.forEach(d => {
      deletePromises.push(deleteDoc(d.ref));
    });

    await Promise.all(deletePromises);

    await deleteDoc(doc(db, "clubs", clubId));
  },

  async verifyClubPassword(clubId: string, password: string): Promise<boolean> {
    const club = await this.getClub(clubId);
    return club?.password === password;
  },

  async getAllStudents(clubId: string): Promise<Student[]> {
    await ensureAuth();
    const querySnapshot = await getDocs(collection(db, "clubs", clubId, "students"));
    return querySnapshot.docs.map((d) =>
      convertTimestampsToDates({ ...d.data(), id: d.id }) as Student
    );
  },

  async getStudent(clubId: string, id: string): Promise<Student | null> {
    await ensureAuth();
    const docRef = doc(db, "clubs", clubId, "students", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return convertTimestampsToDates({ ...docSnap.data(), id: docSnap.id }) as Student;
    }
    return null;
  },

  async saveStudent(clubId: string, student: Student): Promise<void> {
    await ensureAuth();
    const studentData = convertDatesToTimestamp(student);
    await setDoc(doc(db, "clubs", clubId, "students", student.id), studentData);
  },

  async updateStudent(clubId: string, student: Student): Promise<void> {
    await ensureAuth();
    const studentData = convertDatesToTimestamp(student);
    await updateDoc(doc(db, "clubs", clubId, "students", student.id), studentData);
  },

  async deleteStudent(clubId: string, id: string): Promise<void> {
    await ensureAuth();
    await deleteDoc(doc(db, "clubs", clubId, "students", id));
  },

  async getAllClasses(clubId: string): Promise<Class[]> {
    await ensureAuth();
    const querySnapshot = await getDocs(collection(db, "clubs", clubId, "classes"));
    return querySnapshot.docs.map((d) =>
      convertTimestampsToDates({ ...d.data(), id: d.id }) as Class
    );
  },

  async getClass(clubId: string, id: string): Promise<Class | null> {
    await ensureAuth();
    const docRef = doc(db, "clubs", clubId, "classes", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return convertTimestampsToDates({ ...docSnap.data(), id: docSnap.id }) as Class;
    }
    return null;
  },

  async saveClass(clubId: string, classData: Class): Promise<void> {
    await ensureAuth();
    const data = convertDatesToTimestamp(classData);
    await setDoc(doc(db, "clubs", clubId, "classes", classData.id), data);
  },

  async updateClass(clubId: string, classData: Class): Promise<void> {
    await ensureAuth();
    const data = convertDatesToTimestamp(classData);
    await updateDoc(doc(db, "clubs", clubId, "classes", classData.id), data);
  },

  async deleteClass(clubId: string, id: string): Promise<void> {
    await ensureAuth();
    await deleteDoc(doc(db, "clubs", clubId, "classes", id));
  },

  async getAllTransactions(clubId: string): Promise<Transaction[]> {
    await ensureAuth();
    const querySnapshot = await getDocs(collection(db, "clubs", clubId, "transactions"));
    return querySnapshot.docs.map((d) =>
      convertTimestampsToDates({ ...d.data(), id: d.id }) as Transaction
    );
  },

  async getTransaction(clubId: string, id: string): Promise<Transaction | null> {
    await ensureAuth();
    const docRef = doc(db, "clubs", clubId, "transactions", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return convertTimestampsToDates({ ...docSnap.data(), id: docSnap.id }) as Transaction;
    }
    return null;
  },

  async saveTransaction(clubId: string, transaction: Transaction): Promise<void> {
    await ensureAuth();
    const data = convertDatesToTimestamp(transaction);
    await setDoc(doc(db, "clubs", clubId, "transactions", transaction.id), data);
  },

  async updateTransaction(clubId: string, transaction: Transaction): Promise<void> {
    await ensureAuth();
    const data = convertDatesToTimestamp(transaction);
    await updateDoc(doc(db, "clubs", clubId, "transactions", transaction.id), data);
  },

  async deleteTransaction(clubId: string, id: string): Promise<void> {
    await ensureAuth();
    await deleteDoc(doc(db, "clubs", clubId, "transactions", id));
  },

  async deleteTransactionsByClassId(clubId: string, classId: string): Promise<void> {
    await ensureAuth();
    const q = query(collection(db, "clubs", clubId, "transactions"), where("classId", "==", classId));
    const querySnapshot = await getDocs(q);
    const deletePromises = querySnapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  },

  async getAllReceipts(clubId: string): Promise<Receipt[]> {
    await ensureAuth();
    const querySnapshot = await getDocs(collection(db, "clubs", clubId, "receipts"));
    return querySnapshot.docs.map((d) =>
      convertTimestampsToDates({ ...d.data(), id: d.id }) as Receipt
    );
  },

  async getReceipt(clubId: string, id: string): Promise<Receipt | null> {
    await ensureAuth();
    const docRef = doc(db, "clubs", clubId, "receipts", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return convertTimestampsToDates({ ...docSnap.data(), id: docSnap.id }) as Receipt;
    }
    return null;
  },

  async saveReceipt(clubId: string, receipt: Receipt): Promise<void> {
    await ensureAuth();
    const data = convertDatesToTimestamp(receipt);
    await setDoc(doc(db, "clubs", clubId, "receipts", receipt.id), data);
  },

  async deleteReceipt(clubId: string, id: string): Promise<void> {
    await ensureAuth();
    await deleteDoc(doc(db, "clubs", clubId, "receipts", id));
  },

  async getAllPayments(clubId: string): Promise<Payment[]> {
    await ensureAuth();
    const querySnapshot = await getDocs(collection(db, "clubs", clubId, "payments"));
    return querySnapshot.docs.map((d) =>
      convertTimestampsToDates({ ...d.data(), id: d.id }) as Payment
    );
  },

  async savePayment(clubId: string, payment: Payment): Promise<void> {
    await ensureAuth();
    const data = convertDatesToTimestamp(payment);
    await setDoc(doc(db, "clubs", clubId, "payments", payment.id), data);
  },

  async getAllInvoices(clubId: string): Promise<Invoice[]> {
    await ensureAuth();
    const querySnapshot = await getDocs(collection(db, "clubs", clubId, "invoices"));
    return querySnapshot.docs.map((d) =>
      convertTimestampsToDates({ ...d.data(), id: d.id }) as Invoice
    );
  },

  async saveInvoice(clubId: string, invoice: Invoice): Promise<void> {
    await ensureAuth();
    const data = convertDatesToTimestamp(invoice);
    await setDoc(doc(db, "clubs", clubId, "invoices", invoice.id), data);
  },

  async getCurrentUser(clubId: string): Promise<User | null> {
    await ensureAuth();
    const docRef = doc(db, "clubs", clubId, "users", "default");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as User;
    }
    return null;
  },

  async saveCurrentUser(clubId: string, user: User): Promise<void> {
    await ensureAuth();
    await setDoc(doc(db, "clubs", clubId, "users", "default"), user);
  }
};
