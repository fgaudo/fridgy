import 'package:flutter/material.dart';
import 'package:logging/logging.dart';
import 'package:sqlite3/common.dart';

import 'src/application/use_cases/overview.dart' as overview;
import 'src/data/generic/commands/log.dart';
import 'src/data/sqlite3/bootstrap.dart';
import 'src/data/sqlite3/commands/delete_foods_by_ids.dart';
import 'src/data/sqlite3/streams/foods.dart';
import 'src/presentation/flutter/app.dart';

void main() async {
  final sqlite3 = await bootstrap(
    pathToWasm: 'sqlite3.wasm',
    dbName: 'fridgy',
  );

  final database = sqlite3.open(DATABASE, mode: OpenMode.readWrite);
  final readonlyDatabase = sqlite3.open(DATABASE, mode: OpenMode.readOnly);

  runApp(
    MyApp(
      overviewPipeIO: overview.preparePipeIO(
        pending: Stream.value(0).asBroadcastStream(),
        log: prepareLog(
          Logger('APPLICATION Overview'),
        ),
        foods$: prepareFoodsStream(
          database: readonlyDatabase,
          log: prepareLog(
            Logger(r'DATA Foods$'),
          ),
        ),
        deleteByIds: prepareDeleteFoodsByIds(
          database: database,
          log: prepareLog(
            Logger('DATA DeleteByIds'),
          ),
        ),
      ),
    ),
  );
}
