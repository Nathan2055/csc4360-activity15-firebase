import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebasedemo/models/item.dart';

class FirestoreService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String collectionName = 'products';

  Future<String> addItem(Item item) async {
    try {
      var docRef = await _firestore
          .collection(collectionName)
          .add(item.toMap());
      print('Item created');
      String id = docRef.id;
      print("Document written with ID: ");
      return id;
    } catch (e) {
      debugPrint('Error creating item: $e');
      return '';
    }
  }

  Stream<List<Item>> getItemsStream() {
    return _firestore
        .collection(collectionName)
        .snapshots()
        .map(
          (snapshot) =>
              snapshot.docs.map((doc) => Item.fromSnapshot(doc)).toList(),
        );
  }

  Stream<QuerySnapshot<Map<String, dynamic>>> getRawItemsStream() {
    return _firestore.collection(collectionName).snapshots();
  }

  Future<void> updateItem(Item item) async {
    try {
      await _firestore
          .collection(collectionName)
          .doc(item.id)
          .update(item.toMap());
      debugPrint('Item updated');
    } catch (e) {
      debugPrint('Error updating item: $e');
    }
  }

  Future<void> updateItemByID(String id, String name, double price) async {
    try {
      await _firestore.doc(id).update({"name": name, "price": price});
    } catch (e) {
      debugPrint('Error updating item: $e');
    }
  }

  Future<void> deleteItem(String id) async {
    try {
      await _firestore.collection(collectionName).doc(id).delete();
    } catch (e) {
      debugPrint('Error deleting item: $e');
    }
  }

  // Firestore query for search
  Future<Stream<QuerySnapshot<Object?>>?> searchProducts(String query) async {
    try {
      var result = await _firestore
          .collection(collectionName)
          .where('name', isGreaterThanOrEqualTo: query)
          .where('name', isLessThanOrEqualTo: '$query\uf8ff')
          .snapshots();
      return result;
    } catch (e) {
      debugPrint('Error searching items: $e');
      return null;
    }
  }

  // Firestore query for price filter
  Future<Stream<QuerySnapshot<Object?>>?> filterProductsByPrice(
    double minPrice,
    double maxPrice,
  ) async {
    try {
      var result = await _firestore
          .collection(collectionName)
          .where('price', isGreaterThanOrEqualTo: minPrice)
          .where('price', isLessThanOrEqualTo: maxPrice)
          .snapshots();
      return result;
    } catch (e) {
      debugPrint('Error filtering items: $e');
      return null;
    }
  }
}
