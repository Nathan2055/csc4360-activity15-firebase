import 'package:cloud_firestore/cloud_firestore.dart';
class item {

    final String id;
    final String name;
    final int quantity;
    final double price;
    final String category;
    final DateTime createdAt;
    


    Item({
        required this.name,
        required this.quantity,
        required this.price,
        required this.category,
        required this.createdAt,
        required this.id,
    });




//convert item to a firestore-friendly map data

Map<String, dynamic> toMap() {
    return {
        'id': id,
        'name': name,
        'quantity': quantity,
        'price': price,
        'category': category,
        'createdAt': createdAt,
        
    };

    //create an item from a firestore document snapshot
    factory Item.fromSnapshot(DocumentSnapshot snapshot) {
        final data = snapshot.data() as Map<String, dynamic>;
        return Item(
            id: snapshot.id,
            name: data['name'],
            quantity: data['quantity'],
            price: data['price'],
            category: data['category'],
            createdAt: data['createdAt'].toDate(),
        );
    }
}


}
