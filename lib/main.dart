import 'package:flutter/material.dart';
import 'package:logging/logging.dart';

import 'src/application/use_cases/overview.dart' as overview;
import 'src/data/commands/delete_foods_by_ids.dart';
import 'src/data/commands/log.dart';
import 'src/presentation/flutter/app.dart';

void main() async {
  runApp(
    MyApp(
      overviewPipeFactory: overview.preparePipeFactory(
        pending: Stream.value(0),
        log: prepareLoggerLog(
          Logger('Overview'),
        ),
        foods$: Stream.value([]),
        deleteByIds: prepareDeleteFoodsByIds(),
      ),
    ),
  );
}
