import 'package:flutter/material.dart';
import 'package:rxdart/rxdart.dart';

import 'src/app.dart';
import 'src/application/food_overview.dart';
import 'src/core/either.dart';
import 'src/settings/settings_controller.dart';
import 'src/settings/settings_service.dart';

void main() async {
  final commandSubject = PublishSubject<Command>();

  final foodOverview = init(
    FoodOverviewDependencies(
      delete: () async {},
      fetchFoods: (page) => () async => const Right([]),
    ),
  );
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
