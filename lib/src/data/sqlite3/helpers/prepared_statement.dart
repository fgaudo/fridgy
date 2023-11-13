import 'package:functionally/extensions/reader/local.dart';
import 'package:functionally/extensions/reader_io/asks.dart';
import 'package:functionally/extensions/reader_io/bracket.dart';
import 'package:functionally/extensions/reader_io/flat_map_io.dart';
import 'package:functionally/reader_io.dart';
import 'package:sqlite3/common.dart';

import '../../../core/commands/log.dart';

typedef Deps<LOG, ENV> = ({LOG logEnv, CommonDatabase db, ENV env});

ReaderIO<Deps<LOG, ENV>, void> preparedStatement<ENV, LOG>({
  required String sql,
  required ReaderIO<ENV, void> Function(CommonPreparedStatement ps) use,
  Log<LOG>? log,
}) =>
    asks((Deps<LOG, ENV> deps) => deps.db)
        .flatMapIO(
          (db) => () => db.prepare(sql),
        )
        .bracket(
          release: (ps) => Do<Deps<LOG, ENV>>()
              .flatMapIO(
                (_) => ps.dispose,
              )
              .asks((deps) => deps.logEnv)
              .flatMapIO(
                log?.call(LogType.info, 'Prepared statement closed') ??
                    (_) => () {},
              ),
          use: (ps) => ask<Deps<LOG, ENV>>()
              .flatMapIO(
                use(ps).local((deps) => deps.env),
              )
              .asks((deps) => deps.logEnv)
              .flatMapIO(
                log?.call(LogType.info, 'Prepared statement opened') ??
                    (_) => () {},
              ),
        );
