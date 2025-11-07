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
