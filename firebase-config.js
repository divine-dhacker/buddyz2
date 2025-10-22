// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAVR8OxIwbMkasKfjTVQOpi69Ikw6LraSo",
  authDomain: "buddy-ea6cd.firebaseapp.com",
  databaseURL: "https://buddy-ea6cd-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "buddy-ea6cd",
  storageBucket: "buddy-ea6cd.appspot.com",
  messagingSenderId: "947901635950",
  appId: "1:947901635950:web:dd11c3a278eb18768e357f"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
