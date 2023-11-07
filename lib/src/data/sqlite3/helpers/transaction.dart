import 'package:fgaudo_functional/extensions/reader_io/flat_map.dart';
import 'package:fgaudo_functional/reader_io.dart';
import 'package:sqlite3/common.dart';

ReaderIO<CommonDatabase, void> transaction(
  ReaderIO<CommonDatabase, void> run,
) =>
    execute('BEGIN;')
        .flatMap(
          (_) => run,
        )
        .flatMap(
          (_) => execute('COMMIT;'),
        );

ReaderIO<CommonDatabase, void> execute(String s) =>
    (database) => () => database.execute(s);
