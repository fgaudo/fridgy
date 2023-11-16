import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:functionally/io.dart';
import 'package:go_router/go_router.dart';

import '../../application/commands/log.dart';
import '../../application/controllers/overview.dart';
import 'overview.dart';

final class MyApp extends StatelessWidget {
  const MyApp({
    required this.log,
    required this.createOverviewController,
    super.key,
  });

  final IO<OverviewController> createOverviewController;
  final void Function(LogLevel, String) log;

  @override
  Widget build(
    BuildContext context,
  ) =>
      MaterialApp.router(
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
        routerConfig: GoRouter(
          onException: (context, state, router) =>
              router.go(OverviewView.routeName),
          initialLocation: OverviewView.routeName,
          routes: [
            GoRoute(
              path: OverviewView.routeName,
              builder: (context, state) => OverviewView(
                createController: createOverviewController,
              ),
            ),
          ],
        ),
      );
}
