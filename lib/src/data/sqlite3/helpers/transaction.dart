import 'package:fgaudo_functional/task.dart';
import 'package:sqlite3/common.dart';

Task<void> Function(CommonDatabase) transaction<A>(
  Task<A> Function(CommonDatabase) run,
) =>
    (database) => () async {
          database.execute('BEGIN;');
          await run(database)();
          database.execute('COMMIT;');
        };
