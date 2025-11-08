import 'package:flutter/material.dart';
import 'package:firebasedemo/screens/home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  // Form state key
  final _formKey = GlobalKey<FormState>();

  // Hardcoded login details
  final String adminUsername = 'admin';
  final String adminPassword = 'admin';
  final String viewerUsername = 'viewer';
  final String viewerPassword = 'viewer';

  // Text field controllers
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  // Track password visibility for the "show password" toggle
  bool _isPasswordVisible = false;

  void _submitForm() {
    if (_usernameController.text == adminUsername &&
        _passwordController.text == adminPassword) {
      // Login as admin
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => InventoryHomePage()),
      );
    } else if (_usernameController.text == viewerUsername &&
        _passwordController.text == viewerPassword) {
      // Login as viewer
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => InventoryHomePage(readOnly: true),
        ),
      );
    } else {
      // Show error for incorrect credentials
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Incorrect username and/or password')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(64.0),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              spacing: 24.0,
              children: [
                // Username field
                TextFormField(
                  controller: _usernameController,
                  decoration: InputDecoration(
                    labelText: 'Username',
                    prefixIcon: const Icon(Icons.person),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),

                // Password field
                TextFormField(
                  controller: _passwordController,
                  obscureText: !_isPasswordVisible,
                  decoration: InputDecoration(
                    labelText: 'Password',
                    prefixIcon: const Icon(Icons.lock),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _isPasswordVisible
                            ? Icons.visibility
                            : Icons.visibility_off,
                      ),
                      onPressed: () {
                        setState(() {
                          _isPasswordVisible = !_isPasswordVisible;
                        });
                      },
                    ),
                  ),
                ),

                // Submit button
                ElevatedButton(
                  onPressed: _submitForm,
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [Text('Login')],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    ;
  }
}
