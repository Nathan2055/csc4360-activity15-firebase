import 'package:firebasedemo/models/firestore_service.dart';
import 'package:firebasedemo/models/item.dart';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:uuid/uuid.dart';

// Home Screen
class InventoryHomePage extends StatefulWidget {
  const InventoryHomePage({super.key, this.readOnly = false});

  final bool readOnly;

  @override
  State<InventoryHomePage> createState() => _InventoryHomePageState();
}

class _InventoryHomePageState extends State<InventoryHomePage> {
  // Text field controllers
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _priceController = TextEditingController();

  Future<void> _sendCreateOrUpdate(
    String action,
    String name,
    double price,
    String id,
  ) async {
    debugPrint(id);
    debugPrint(action);
    debugPrint(name);
    debugPrint(price.toString());
    if (name.isNotEmpty && !price.isNaN && price.isFinite) {
      debugPrint(action);
      if (action == 'create') {
        // Persist a new product to Firestore
        debugPrint('creating item');
        Item item = Item(
          id: Uuid().v4(),
          name: name,
          price: price,
          createdAt: DateTime.now(),
        );
        debugPrint('item created');
        debugPrint(item.toString());
        String finalid = await FirestoreService().addItem(item);
        debugPrint(finalid);
      }

      if (action == 'update') {
        // Update the product
        await FirestoreService().updateItemByID(id, name, price);
      }

      _nameController.text = '';
      _priceController.text = '';
    }
  }

  // Create or update a Firestore product entry
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
                onPressed: () {
                  var id = '';
                  if (documentSnapshot?.id != null) {
                    id = documentSnapshot!.id;
                  }
                  _sendCreateOrUpdate(
                    action,
                    _nameController.text,
                    double.parse(_priceController.text),
                    id,
                  );
                  Navigator.of(context).pop();
                },
              ),
            ],
          ),
        );
      },
    );
  }

  // Delete a Firestore product entry by id
  Future<void> _deleteProduct(String productId) async {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('You have successfully deleted a product')),
    );
  }

  // Firestore query for search
  Stream<QuerySnapshot> _searchProducts(String query) {
    return FirebaseFirestore.instance
        .collection('products')
        .where('name', isGreaterThanOrEqualTo: query)
        .where('name', isLessThanOrEqualTo: '$query\uf8ff')
        .snapshots();
  }

  // Firestore query for price filter
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
      appBar: AppBar(title: const Text('Firebase Inventory Management')),
      // Using StreamBuilder to display all products from Firestore in real-time
      body: StreamBuilder(
        stream: FirestoreService().getRawItemsStream(),
        builder: (context, AsyncSnapshot<QuerySnapshot> streamSnapshot) {
          // Once the database is ready, build a ListView with Cards
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
                            onPressed: () =>
                                debugPrint(documentSnapshot.id.toString()),

                            //onPressed: () => _createOrUpdate(documentSnapshot),
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
          // Show loading indicator if the database is not ready
          return const Center(child: CircularProgressIndicator());
        },
      ),
      // Add a new product
      floatingActionButton: FloatingActionButton(
        onPressed: () => _createOrUpdate(),
        tooltip: 'Add Item',
        child: const Icon(Icons.add),
      ),
    );
  }
}
