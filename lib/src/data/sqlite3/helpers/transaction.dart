import 'package:fgaudo_functional/io.dart';
import 'package:sqlite3/common.dart';

IO<void> Function(CommonDatabase) transaction(
  IO<void> Function(CommonDatabase) run,
) =>
    (database) => () {
          database.execute('BEGIN;');
          run(database)();
          database.execute('COMMIT;');
        };
