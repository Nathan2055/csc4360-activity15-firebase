import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebasedemo/firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      // Remove the debug banner
      debugShowCheckedModeBanner: false,
      title: 'Inventory Management App',
      theme: ThemeData(primarySwatch: Colors.blue),
      home: InventoryHomePage(),
    );
  }
}

class InventoryHomePage extends StatefulWidget {
  const InventoryHomePage({super.key});

  @override
  State<InventoryHomePage> createState() => _InventoryHomePageState();
}

class _InventoryHomePageState extends State<InventoryHomePage> {
  // TODO: 1. Initialize Firestore & Create a Stream for items
  // TODO: 2. Build a ListView using a StreamBuilder to display items
  // TODO: 3. Implement Navigation to an "Add Item" screen
  // TODO: 4. Implement one of the Delete methods (swipe or in-edit)

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('CRUD operations')),
      body: InventoryHomePage(),
    );
  }
}

/*
Code Snippet Example: Firestore Query for Search
Stream<QuerySnapshot> _searchProducts(String query) {
  return FirebaseFirestore.instance
      .collection('products')
      .where('name', isGreaterThanOrEqualTo: query)
      .where('name', isLessThanOrEqualTo: query + '\uf8ff')
      .snapshots();
}
Code Snippet Example: Firestore Query for Price Filter
Stream<QuerySnapshot> _filterProductsByPrice(double minPrice, double maxPrice) {
  return FirebaseFirestore.instance
      .collection('products')
      .where('price', isGreaterThanOrEqualTo: minPrice)
      .where('price', isLessThanOrEqualTo: maxPrice)
      .snapshots();
}
*/

/*
// In Home Screen - Floating Action Button
onPressed: () {
  Navigator.push(
    context,
    MaterialPageRoute(builder: (context) => AddEditItemScreen()),
  );
},

// In Home Screen List Item - Edit Navigation
onTap: () {
  Navigator.push(
    context,
    MaterialPageRoute(
      builder: (context) => AddEditItemScreen(item: item),
    ),
  );
},
*/
