import 'package:flutter/material.dart';

import '../../application/app.dart';

class AppInheritedWidget extends InheritedWidget {
  const AppInheritedWidget({
    required this.app,
    required super.child,
    super.key,
  });

  final App app;

  static AppInheritedWidget? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<AppInheritedWidget>();

  static AppInheritedWidget of(BuildContext context) {
    final result = maybeOf(context);
    assert(result != null, 'No AppInheritedWidget found in context');
    return result!;
  }

  @override
  bool updateShouldNotify(AppInheritedWidget oldWidget) => false;
}
