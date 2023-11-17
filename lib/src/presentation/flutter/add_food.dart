import 'package:flutter/material.dart';

final class AddFoodView extends StatelessWidget {
  const AddFoodView({super.key});

  static const String routeName = '/add-food';

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          automaticallyImplyLeading: false,
          title: const Text('Add food'),
        ),
        body: const SizedBox.shrink(),
      );
}
