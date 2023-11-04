import 'package:fgaudo_functional/io.dart';
import 'package:flutter/material.dart';

import '../application/overview.dart';
import '../core/pipe.dart';
import '../core/pipe_builder.dart';

final class OverviewView extends StatelessWidget {
  const OverviewView({
    required this.createPipe,
    super.key,
  });

  static const routeName = '/overview';

  final IO<Pipe<Command, OverviewModel>> createPipe;

  @override
  Widget build(BuildContext context) => PipeBuilder(
        createPipe: createPipe,
        builder: (ctx, snapshot) => snapshot.hasData
            ? ColoredBox(
                color: switch (snapshot.data!) {
                  Ready() => Colors.black,
                  _ => Colors.white
                },
              )
            : const SizedBox.shrink(),
      );
}
