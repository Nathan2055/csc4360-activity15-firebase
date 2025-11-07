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
