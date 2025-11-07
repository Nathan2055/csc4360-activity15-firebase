import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebasedemo/firebase_options.dart';
import 'package:firebasedemo/models/firestore_service.dart';
import 'package:firebasedemo/models/item.dart';

// Home Screen
class InventoryHomePage extends StatefulWidget {
  const InventoryHomePage({super.key});

  @override
  State<InventoryHomePage> createState() => _InventoryHomePageState();
}

class _InventoryHomePageState extends State<InventoryHomePage> {
  // text fields' controllers
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _priceController = TextEditingController();

  final CollectionReference _products = FirebaseFirestore.instance.collection(
    'products',
  );

  Future<void> _createOrUpdate([DocumentSnapshot? documentSnapshot]) async {
    String action = 'create';
    if (documentSnapshot != null) {
      action = 'update';
      _nameController.text = documentSnapshot['name'];
      _priceController.text = documentSnapshot['price'].toString();
    }

    await showModalBottomSheet(
      isScrollControlled: true,
      context: context,
      builder: (BuildContext ctx) {
        return Padding(
          padding: EdgeInsets.only(
            top: 20,
            left: 20,
            right: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Name'),
              ),
              TextField(
                keyboardType: TextInputType.numberWithOptions(decimal: true),
                controller: _priceController,
                decoration: const InputDecoration(labelText: 'Price'),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                child: Text(action == 'create' ? 'Create' : 'Update'),
                onPressed: () async {
                  String name = _nameController.text;
                  double price = double.parse(_priceController.text);
                  if (name.isNotEmpty && !price.isNaN && !price.isFinite) {
                    if (action == 'create') {
                      // Persist a new product to Firestore
                      await _products.add({"name": name, "price": price});
                    }

                    if (action == 'update') {
                      // Update the product
                      await _products.doc(documentSnapshot!.id).update({
                        "name": name,
                        "price": price,
                      });
                    }

                    _nameController.text = '';
                    _priceController.text = '';

                    Navigator.of(context).pop();
                  }
                },
              ),
            ],
          ),
        );
      },
    );
  }

  // Deleting a product by id
  Future<void> _deleteProduct(String productId) async {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('You have successfully deleted a product')),
    );
  }

  //Code Snippet Example: Firestore Query for Search
  Stream<QuerySnapshot> _searchProducts(String query) {
    return FirebaseFirestore.instance
        .collection('products')
        .where('name', isGreaterThanOrEqualTo: query)
        .where('name', isLessThanOrEqualTo: query + '\uf8ff')
        .snapshots();
  }

  //Code Snippet Example: Firestore Query for Price Filter
  Stream<QuerySnapshot> _filterProductsByPrice(
    double minPrice,
    double maxPrice,
  ) {
    return FirebaseFirestore.instance
        .collection('products')
        .where('price', isGreaterThanOrEqualTo: minPrice)
        .where('price', isLessThanOrEqualTo: maxPrice)
        .snapshots();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // Using StreamBuilder to display all products from Firestore in real-time
      body: StreamBuilder(
        stream: _products.snapshots(),
        builder: (context, AsyncSnapshot<QuerySnapshot> streamSnapshot) {
          if (streamSnapshot.hasData) {
            return ListView.builder(
              itemCount: streamSnapshot.data!.docs.length,
              itemBuilder: (context, index) {
                final DocumentSnapshot documentSnapshot =
                    streamSnapshot.data!.docs[index];
                return Card(
                  margin: const EdgeInsets.all(10),
                  child: ListTile(
                    title: Text(documentSnapshot['name']),
                    subtitle: Text(documentSnapshot['price'].toString()),
                    trailing: SizedBox(
                      width: 100,
                      child: Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.edit),
                            onPressed: () => _createOrUpdate(documentSnapshot),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete),
                            onPressed: () =>
                                _deleteProduct(documentSnapshot.id),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            );
          }

          return const Center(child: CircularProgressIndicator());
        },
      ),
      // Add new product
      // TODO: Navigate to the Add/Edit Item Form
      floatingActionButton: FloatingActionButton(
        onPressed: () => _createOrUpdate(),
        tooltip: 'Add Item',
        child: const Icon(Icons.add),
      ),
      /*
      body: StreamBuilder<List<Item>>(
        stream: FirestoreService().getItemsStream(),
        builder: (context, snapshot) {
          // TODO: Handle loading state
          // TODO: Handle error state
          // TODO: Handle empty state
          // TODO: Build ListView with item data
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // TODO: Navigate to AddEditItemScreen
        },
        child: Icon(Icons.add),
      ),
      */
    );
  }
}
