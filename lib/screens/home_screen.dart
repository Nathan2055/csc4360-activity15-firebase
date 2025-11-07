// Home Screen
class InventoryHomePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
    );
  }
}
