import 'package:fgaudo_functional/task.dart';
import 'package:sqlite3/common.dart';

Task<void> transaction<A>(
  CommonDatabase database,
  Task<A> Function(CommonDatabase) f,
) =>
    () async {
      database.execute('BEGIN;');
      await f(database)();
      database.execute('COMMIT;');
    };
