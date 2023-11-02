import 'package:fgaudo_functional/either.dart';
import 'package:flutter/material.dart';
import 'package:logging/logging.dart';
import 'package:rxdart/rxdart.dart';

import 'src/app.dart';
import 'src/application/food_overview.dart';
import 'src/settings/settings_controller.dart';
import 'src/settings/settings_service.dart';

void main() async {
  Logger.root.level = Level.ALL; // defaults to Level.INFO
  Logger.root.onRecord.listen((record) {
    print('${record.level.name}: ${record.time}: ${record.message}');
  });

  final foodOverview = init(
    FoodOverviewDependencies(
      logError: (message) => () => Logger.root.severe(message),
      logInfo: (message) => () => Logger.root.fine(message),
      foods: Stream.value([]),
      delete: () async => const Right(null),
      fetchFoods: (page) => () async => const Right([]),
    ),
  );

  final commandSubject = PublishSubject<Command>();
  commandSubject.transform(foodOverview).listen((model) {});

  // Set up the SettingsController, which will glue user settings to multiple
  // Flutter Widgets.
  final settingsController = SettingsController(SettingsService());

  // Load the user's preferred theme while the splash screen is displayed.
  // This prevents a sudden theme change when the app is first displayed.
  await settingsController.loadSettings();

  // Run the app and pass in the SettingsController. The app listens to the
  // SettingsController for changes, then passes it further down to the
  // SettingsView.
  runApp(
    MyApp(settingsController: settingsController),
  );
}
