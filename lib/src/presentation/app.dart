import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../data/app.dart';
import 'flutter/app.dart';

const debugMode = kDebugMode;

Future<void> run(
  AppImpl app,
) async {
  runApp(
    AppWidget(appWithDeps: app),
  );
}
