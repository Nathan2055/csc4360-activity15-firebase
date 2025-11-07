import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebasedemo/firebase_options.dart';
import 'package:firebasedemo/screens/home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  runApp(const FirebaseDemoApp());
}

// TODO: 1. Initialize Firestore & Create a Stream for items
// TODO: 2. Build a ListView using a StreamBuilder to display items
// TODO: 3. Implement Navigation to an "Add Item" screen
// TODO: 4. Implement one of the Delete methods (swipe or in-edit)

class FirebaseDemoApp extends StatelessWidget {
  const FirebaseDemoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      // Remove the debug banner
      debugShowCheckedModeBanner: false,
      title: 'Inventory Management App',
      theme: ThemeData(primarySwatch: Colors.blue),
      home: Scaffold(
        appBar: AppBar(title: const Text('CRUD operations')),
        body: InventoryHomePage(),
      ),
    );
  }
}
