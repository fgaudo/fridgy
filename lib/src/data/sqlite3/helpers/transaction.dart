import 'package:fgaudo_functional/task.dart';
import 'package:sqlite3/common.dart';

Task<void> transaction<A>({
  required CommonDatabase database,
  required Task<A> Function(CommonDatabase) run,
}) =>
    () async {
      database.execute('BEGIN;');
      await run(database)();
      database.execute('COMMIT;');
    };
