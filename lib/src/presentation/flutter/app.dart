import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';

import '../../application/app.dart';
import 'overview.dart';

final class MyApp extends StatelessWidget {
  const MyApp({
    required AppWithDeps appWithDeps,
    super.key,
  }) : _appWithDeps = appWithDeps;

  final AppWithDeps _appWithDeps;

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
                createController: _appWithDeps.overview,
              ),
            ),
          ],
        ),
      );
}
