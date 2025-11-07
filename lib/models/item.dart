class Item {
  // TODO: Declare fields (id, name, quantity, price, category, createdAt)

  Item() {} // unnamed constructor

  // TODO: Create constructor with named parameters

  // TODO: Implement toMap() for Firestore
  Map<String, dynamic> toMap() {
    return {
      // TODO: Convert all fields to map
    };
  }

  // TODO: Implement fromMap() factory constructor
  factory Item.fromMap(String id, Map<String, dynamic> map) {
    return Item(
      // TODO: Extract values from map
    );
  }
}
