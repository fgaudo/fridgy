import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:js/js.dart';

import '../data/app.dart';
import 'flutter/app.dart';

@JS('execute')
external set _execute(void Function(String, List<dynamic>?) f);

@JS('select')
external set _select(
  List<dynamic> Function(String, List<dynamic>?) f,
);

Future<void> run(
  Future<AppImpl> Function({required bool debugMode}) createApp,
) async {
  final app = await createApp(debugMode: kDebugMode);

  _select = allowInterop(
    (query, values) => app.retrieve((query: query, params: values))(),
  );
  _execute = allowInterop(
    (query, values) => app.execute((query: query, params: values))(),
  );

  runApp(
    AppWidget(appWithDeps: app),
  );
}
