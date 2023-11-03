import 'package:flutter/material.dart';
import 'package:logging/logging.dart';
import 'package:rxdart/rxdart.dart';

import 'src/application/food_overview.dart';
import 'src/presentation/app.dart';

final class Pipe<C, S> {
  const Pipe({required this.sink, required this.stream});

  final Sink<C> sink;
  final Stream<S> stream;
}

void main() async {
  Logger.root.level = Level.ALL; // defaults to Level.INFO
  Logger.root.onRecord.listen((record) {
    print('${record.level.name}: ${record.time}: ${record.message}');
  });

  final foodOverviewTransformer = createFoodOverviewTransformer(
    FoodOverviewDependencies(
      pending: Stream.value(0),
      logError: (message) => () => Logger.root.severe(message),
      logInfo: (message) => () => Logger.root.fine(message),
      foods: Stream.value([]),
      deleteByIds: (ids) => () async {},
    ),
  );

  const subject = PublishSubject.new;

  // Run the app and pass in the SettingsController. The app listens to the
  // SettingsController for changes, then passes it further down to the
  // SettingsView.
  runApp(
    MyApp(
      foodOverviewTransformer: foodOverviewTransformer,
    ),
  );
}
