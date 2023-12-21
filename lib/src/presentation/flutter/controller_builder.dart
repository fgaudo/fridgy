import 'package:flutter/material.dart';
import 'package:functionally/option.dart';

import '../../core/controller.dart';

final class ControllerBuilder<A, B> extends StatelessWidget {
  const ControllerBuilder({
    required this.controller,
    required this.builder,
    this.initialData,
    super.key,
  });

  final Controller<A, B> controller;
  final Widget Function(
    BuildContext context,
    Option<B> b,
    void Function(A a) dispatch,
  ) builder;
  final B? initialData;

  @override
  Widget build(BuildContext context) => StreamBuilder(
        stream: controller.stream,
        builder: (ctx, snapshot) => builder(
          ctx,
          fromNullable(snapshot.data),
          controller.add,
        ),
        initialData: initialData,
        key: key,
      );
}
