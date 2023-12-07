import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';

import '../../application/app.dart';
import 'add_food.dart';
import 'app_inherited.dart';
import 'overview.dart';

final class AppWidget extends StatelessWidget {
  const AppWidget({
    required App appWithDeps,
    super.key,
  }) : _appWithDeps = appWithDeps;

  final App _appWithDeps;

  @override
  Widget build(
    BuildContext context,
  ) =>
      AppInheritedWidget(
        app: _appWithDeps,
        child: MaterialApp.router(
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
                builder: (context, state) => const OverviewView(),
              ),
              GoRoute(
                path: AddFoodView.routeName,
                builder: (context, state) => const AddFoodView(),
              ),
            ],
          ),
        ),
      );
}
