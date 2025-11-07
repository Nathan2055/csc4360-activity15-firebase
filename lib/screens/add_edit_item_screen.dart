import 'package:flutter/material.dart';

// Add/Edit Screen
class AddEditItemScreen extends StatefulWidget {
  const AddEditItemScreen({super.key});

  // TODO: Accept optional Item parameter for editing
  @override
  _AddEditItemScreenState createState() => _AddEditItemScreenState();
}

class _AddEditItemScreenState extends State<AddEditItemScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Form(
        child: Column(
          children: [
            // TODO: Add TextFormField for name
            // TODO: Add TextFormField for quantity
            // TODO: Add TextFormField for price
            // TODO: Add TextFormField for category
            // TODO: Create save button
            // TODO: Add delete button (only in edit mode)
          ],
        ),
      ),
    );
  }
}
