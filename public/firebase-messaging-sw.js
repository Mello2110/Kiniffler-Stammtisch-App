importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
    apiKey: "AIzaSyCFa09-8DVF8o2OQssr15lZJ-aCIvh21HM",
    authDomain: "webapp-stammtisch.firebaseapp.com",
    projectId: "webapp-stammtisch",
    storageBucket: "webapp-stammtisch.firebasestorage.app",
    messagingSenderId: "112239637478",
    appId: "1:112239637478:web:78a18a3671f33605801c27",
    measurementId: "G-HGCS3PGQDY"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Customize notification here
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/kanpai-logo.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
