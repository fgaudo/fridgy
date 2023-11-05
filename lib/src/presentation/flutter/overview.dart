import 'package:fgaudo_functional/extensions/option/match.dart';
import 'package:flutter/material.dart';

import '../../application/use_cases/overview.dart';
import '../../core/pipe_builder.dart';

final class OverviewView extends StatelessWidget {
  const OverviewView({
    required this.pipeFactory,
    super.key,
  });

  static const String routeName = '/overview';

  final OverviewPipeFactory pipeFactory;

  @override
  Widget build(
    BuildContext context,
  ) =>
      PipeBuilder(
        createPipe: pipeFactory,
        builder: (_, modelOption, __) => modelOption.match(
          onNone: const SizedBox.shrink(),
          onSome: (data) => ColoredBox(
            color: switch (data) {
              Ready() => Colors.black,
              Error() => Colors.white,
              Loading() => Colors.white
            },
          ),
        ),
      );
}
