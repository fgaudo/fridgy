import 'package:fgaudo_functional/io.dart';
import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import '../application/food_overview.dart';
import '../core/pipe.dart';
import 'food_overview.dart';

final class MyApp extends StatelessWidget {
  const MyApp({
    required this.createPipe,
    super.key,
  });

  final IO<Pipe<Command, FoodOverviewModel>> createPipe;

  @override
  Widget build(
    BuildContext context,
  ) =>
      MaterialApp(
        restorationScopeId: 'app',
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: const [
          Locale('en', ''),
        ],
        onGenerateTitle: (context) => AppLocalizations.of(context)!.appTitle,
        theme: ThemeData(),
        darkTheme: ThemeData.dark(),
        onGenerateRoute: (routeSettings) => MaterialPageRoute<void>(
          settings: routeSettings,
          builder: (context) => FoodOverviewView(
            createPipe: createPipe,
            key: key,
          ),
        ),
      );
}
