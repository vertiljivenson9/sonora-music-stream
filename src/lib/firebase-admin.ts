import admin from 'firebase-admin';

// Service account hardcodeado para evitar problemas con env vars en Vercel
const serviceAccount = {
  type: "service_account",
  project_id: "sonara-e38cb",
  private_key_id: "278ba66cde55b347483d666dc06f538761adfe90",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDNNs2a3IRLCoS4\nVtn9nPUA4V6gC3abm0j88y+eVDP5YgcUJ9ua7zIdVLPklwldLYPprTg9fSGN4h5r\nhFcbT1sdwkOAm43XIFcGfybLv6MRCr44oabV5ZkpFyF54tN9e8jTuX1fE5BUDe2F\nBNEeaJkswI+u/Q1V3AUIaGyvRsf6NCs/qOm7jcb+IBRNa9kCyVMNIQfCmRkNSTjt\nfHj30Vtx9ywd0kKs2pu1AANrqE77me5mWuvO3cibFU5pNgHSU4wPSTCHy0hjI6R4\neu1Z0CAlhNhPfbQdmEeZLuQjssYdQzehlYhKPH3wiznvN4wQ7zAyOXyePrzTZjYQ\n9RTpsjSBAgMBAAECggEAUTDSjeebK7lgozIxkwarZIrGDloathvs968bcu/rlEo1\ndMMEPrtOP46IkfMz0Dq2yxgufR1pziHdWTqF4Bc4fICkhliE+M0hwT9DUS9jy9VN\nR0ilolDxlPFC3F9iv23fGe10bc5mtuq/w3YRao+FstAIyPnzcbnX/+iYv4woiJOv\n0FejNfu/Q6I1VzSmq6CxsIpvvKCbaeTIo005FFESe85oFb8xnJ2I5awNEnersJr2\nqi+/ZqkvHHE895Yma6FpwsNmIK0ltbTgJCAsy5SNPSpcmigzBF3C+0xJpRffroZH\njQOikPbQKVaSaTetN3lW7VQyDCM/nsd0j8GGok5j9QKBgQDvrWWkfFRDz5HPMSG2\nUPUTaoHxrG5R1p47nXOBQ4CitrhD0+G6kxbfDQ1K4sbBNThuqdLJVtYs5W4bfir2\nhssZ9DETavoJuHLCQusbZUC9WIk0ZDXY81QVW+ZPT2L7Ff8+vbK1NHSLvRAPa1mx\ne8HDMtyUF+WIdKqZ93E5lVQKKwKBgQDbMJBYLW8IOmsmy8O5Yp+VDhvZn30mMB6/\nHHWRbuzyJREd8BTkCn1MDRa9kJq495J3ilAjbrGgIuzhGfL7t6o8zxvviZtDwLtZ\nw0R6q2WazcbZ3to2pNBNXDkj77be4RiwECzMTmPFsQzOjxnye+qhVAsdnn7DqIYV\nkQc8BMVCAwKBgGfVTvt7gWX/PsPsHRbG6+WFdtYkRYbe254oECon/EqBrkJ0QI57\nuqTXGrMem8yIKfKHT/I51H+OxazTc/lpXAPabohjB/++ELloFELCEtH00TwJTeq3\nP+4g6h3h3pe4Z+PeetVV7Ee9mH+Vmj3xx3exSS4/TAlZwa8CK+MudkIRAoGAeN7y\n+m0ziWoNpLtBF34XWm8JVJzquqBWlDTxcF2nNHDUW5oFKyvNpJ6jJ64SZGXB00Hm\np2NneFNKJWfV4pGJwzbCxPkxMc+agQl5Pdw+j3tiaMrHstJ4O/DbYcHTKl0e7Bg/\nW/ruchoMYevv9xP2cziRWKgKZ4MLTeFICATpclkCgYEAqTaj2tZx9+lOlRsT+NUI\nUBX6jEsIbh7zLScxBi5+LFs03quNc1KJWbBy4mcGmXBBgGZhYEJYJypbMR+5IAqi\npuT+CSA+fdFRaEGoOed1Ram22hUGP2uVK6iqJjDYmyWnaSX35bD7n4YXVcBtBT0k\n1EnaunyLtw36ES3wEcfcI00=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@sonara-e38cb.iam.gserviceaccount.com",
  client_id: "113475461822514806219",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40sonara-e38cb.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

let initialized = false;

const getAdminApp = () => {
  if (!initialized && admin.apps.length === 0) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'sonara-e38cb.firebasestorage.app',
        databaseURL: 'https://sonara-e38cb-default-rtdb.firebaseio.com',
      });
      console.log('Firebase Admin initialized with service account');
    } catch (e) {
      console.warn('Firebase Admin init error:', e);
    }
    initialized = true;
  }
  return admin;
};

export const adminApp = getAdminApp();
export const adminDb = adminApp.database();
export const adminStorage = adminApp.storage();
export const adminBucket = adminStorage.bucket();
