import 'dart:async';

import 'package:flutter/material.dart';
import 'package:rxdart/rxdart.dart';

import '../application/food_overview.dart';

final class FoodOverviewView extends StatefulWidget {
  const FoodOverviewView({
    required this.foodOverviewTransformer,
    super.key,
  });

  static const routeName = '/settings';

  final StreamTransformer<Command, FoodOverviewModel> foodOverviewTransformer;

  @override
  State<StatefulWidget> createState() => _FoodOverviewState();
}

final class _FoodOverviewState extends State<FoodOverviewView> {
  late final PublishSubject<Command> _subject;
  late final Stream<FoodOverviewModel> _model$;

  @override
  void initState() {
    super.initState();

    _subject = PublishSubject();
    _model$ = widget.foodOverviewTransformer.bind(_subject);
  }

  @override
  void dispose() {
    super.dispose();

    _subject.close();
  }

  void _add(Command command) {
    if (_subject.isClosed) {
      return;
    }
    _subject.add(command);
  }

  @override
  Widget build(BuildContext context) => StreamBuilder(
        stream: _model$,
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
