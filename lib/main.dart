import 'package:flutter/material.dart';
//import 'package:firebase_core/firebase_core.dart';
//import 'package:firebasedemo/firebase_options.dart';
//import 'package:firebasedemo/screens/home_screen.dart';
import 'package:firebasedemo/screens/login_screen.dart';

void main() {
  //WidgetsFlutterBinding.ensureInitialized();
  //await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  runApp(const FirebaseDemoApp());
}

class FirebaseDemoApp extends StatelessWidget {
  const FirebaseDemoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Firebase Inventory Management',
      home: Scaffold(
        appBar: AppBar(title: const Text('Firebase Inventory Management')),
        body: LoginScreen(),
      ),
    );
  }
}
