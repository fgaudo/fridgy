import 'package:fgaudo_functional/io.dart';
import 'package:flutter/material.dart';

import 'pipe.dart';

final class PipeBuilder<A, B> extends StatefulWidget {
  const PipeBuilder({
    required this.createPipe,
    required this.builder,
    super.key,
  });

  final IO<Pipe<A, B>> createPipe;
  final AsyncWidgetBuilder<B> builder;

  @override
  State<StatefulWidget> createState() => _PipeBuilderState<A, B>();
}

final class _PipeBuilderState<A, B> extends State<PipeBuilder<A, B>> {
  late final Pipe<A, B> _pipe;

  @override
  void initState() {
    super.initState();

    _pipe = widget.createPipe();
  }

  @override
  void dispose() {
    super.dispose();

    _pipe.close();
  }

  @override
  Widget build(BuildContext context) => StreamBuilder(
        stream: _pipe.stream,
        builder: widget.builder,
      );
}
