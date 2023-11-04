import 'package:fgaudo_functional/io.dart';
import 'package:flutter/material.dart';

import '../application/food_overview.dart';
import '../core/pipe.dart';

final class FoodOverviewView extends StatefulWidget {
  const FoodOverviewView({
    required this.createPipe,
    super.key,
  });

  static const routeName = '/settings';

  final IO<Pipe<Command, FoodOverviewModel>> createPipe;

  @override
  State<StatefulWidget> createState() => _FoodOverviewState();
}

final class _FoodOverviewState extends State<FoodOverviewView> {
  late final Pipe<Command, FoodOverviewModel> _pipe;

  @override
  void initState() {
    super.initState();

    _pipe = widget.createPipe();
  }

  @override
  void dispose() {
    super.dispose();

    _pipe.close();
  }

  void _add(Command command) {
    _pipe.add(command);
  }

  @override
  Widget build(BuildContext context) => StreamBuilder(
        stream: _pipe.stream,
        builder: (ctx, snapshot) => snapshot.hasData
            ? ColoredBox(
                color: switch (snapshot.data!) {
                  Ready() => Colors.black,
                  _ => Colors.white
                },
              )
            : const SizedBox.shrink(),
      );
}
