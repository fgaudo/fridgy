import 'package:fgaudo_functional/io.dart';
import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import '../../core/commands/log.dart';
import '../../application/use_cases/overview.dart';
import 'overview.dart';

final class MyApp extends StatelessWidget {
  const MyApp({
    required this.log,
    required this.createOverviewController,
    super.key,
  });

  final IO<OverviewController> createOverviewController;
  final void Function(LogType, String) log;

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
        initialRoute: OverviewView.routeName,
        onGenerateRoute: (routeSettings) => MaterialPageRoute<void>(
          settings: routeSettings,
          builder: (context) => OverviewView(
            createController: createOverviewController,
            key: key,
          ),
        ),
      );
}
