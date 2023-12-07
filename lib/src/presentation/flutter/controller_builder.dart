import 'package:flutter/material.dart';
import 'package:functionally/io.dart';
import 'package:functionally/option.dart';

import '../../core/controller.dart';

final class ControllerBuilder<A, B> extends StatefulWidget {
  const ControllerBuilder({
    required this.createController,
    required this.builder,
    this.initialData,
    super.key,
  });

  final IO<Controller<A, B>> createController;
  final Widget Function(
    BuildContext context,
    Option<B> b,
    void Function(A a) dispatch,
  ) builder;
  final B? initialData;

  @override
  State<StatefulWidget> createState() => _ControllerBuilderState<A, B>();
}

final class _ControllerBuilderState<A, B>
    extends State<ControllerBuilder<A, B>> {
  late final Controller<A, B> _controller;

  @override
  void initState() {
    super.initState();

    _controller = widget.createController();
  }

  @override
  void dispose() {
    super.dispose();

    _controller.close();
  }

  @override
  Widget build(BuildContext context) => StreamBuilder(
        stream: _controller.stream,
        builder: (ctx, snapshot) =>
            widget.builder(ctx, fromNullable(snapshot.data), _controller.add),
        initialData: widget.initialData,
        key: widget.key,
      );
}
