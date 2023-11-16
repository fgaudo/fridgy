import 'package:flutter/material.dart';
import 'package:functionally/extensions/option/match.dart';
import 'package:functionally/io.dart';

import '../../application/controllers/overview.dart';
import '../../core/controller_builder.dart';

final class OverviewView extends StatelessWidget {
  const OverviewView({
    required this.createController,
    super.key,
  });

  static const String routeName = '/overview';

  final IO<OverviewController> createController;

  @override
  Widget build(
    BuildContext context,
  ) =>
      ControllerBuilder(
        key: key,
        createController: createController,
        builder: (_, modelOption, __) => modelOption.match(
          onNone: const ColoredBox(color: Colors.black),
          onSome: (data) => Scaffold(
            appBar: AppBar(
              automaticallyImplyLeading: false,
              title: const Text('Bottom App Bar Demo'),
            ),
            body: ListView(
              padding: const EdgeInsets.only(bottom: 88),
              children: const <Widget>[],
            ),
            floatingActionButton: FloatingActionButton(
              onPressed: () {},
              tooltip: 'Create',
              child: const Icon(Icons.add),
            ),
            floatingActionButtonLocation:
                FloatingActionButtonLocation.endDocked,
            bottomNavigationBar: BottomAppBar(
              shape: const CircularNotchedRectangle(),
              color: Colors.blue,
              child: IconTheme(
                data: IconThemeData(
                  color: Theme.of(context).colorScheme.onPrimary,
                ),
                child: Row(
                  children: <Widget>[
                    IconButton(
                      tooltip: 'Open navigation menu',
                      icon: const Icon(Icons.menu),
                      onPressed: () {},
                    ),
                    IconButton(
                      tooltip: 'Search',
                      icon: const Icon(Icons.search),
                      onPressed: () {},
                    ),
                    IconButton(
                      tooltip: 'Favorite',
                      icon: const Icon(Icons.favorite),
                      onPressed: () {},
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
}
