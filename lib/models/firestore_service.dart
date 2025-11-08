import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebasedemo/models/item.dart';

class FirestoreService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String collectionName = 'items';

  Future<void> addItem(Item item) async {
    await _firestore.collection(collectionName).add(item.toMap());
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

  Future<void> updateItem(Item item) async {
    try {
      await _firestore
          .collection(collectionName)
          .doc(item.id)
          .update(item.toMap());
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
}
