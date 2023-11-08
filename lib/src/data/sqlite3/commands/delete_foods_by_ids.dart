import 'package:fgaudo_functional/extensions/reader_io/bracket.dart';
import 'package:fgaudo_functional/extensions/reader_io/local.dart';
import 'package:fgaudo_functional/reader_io.dart';
import 'package:logging/logging.dart';
import 'package:sqlite3/wasm.dart';

import '../../../application/commands/delete_foods_by_ids.dart';
import '../../../application/commands/log.dart';
import '../bootstrap.dart';
import '../helpers/transaction.dart';

final class DeleteFoodsByIdsDeps implements HasTransactionDeps {
  const DeleteFoodsByIdsDeps({
    required this.db,
    required this.logger,
    required this.log,
  });

  final CommonDatabase db;

  @override
  final Logger logger;

  @override
  final Log<Logger> log;

  @override
  CommonDatabase get writeDB => db;
}

const String deleteQuery =
    'DELETE FROM $FOODS_TABLE WHERE $FOODS_TABLE_NAME = ?;';

final DeleteFoodsByIds<DeleteFoodsByIdsDeps> deleteFoodsByIds = (ids) =>
    transaction(
      _prepareDeletes
          .local(
            (DeleteFoodsByIdsDeps deps) =>
                (log: deps.log, logger: deps.logger, db: deps.db),
          )
          .bracket(
            release: (ps) => (deps) => () {
                  ps.dispose();
                  deps.log(
                    LogType.info,
                    'Prepared statement closed',
                  )(deps.logger);
                },
            use: (ps) => (deps) => () => ids.map((id) => [id]).forEach((id) {
                  ps.execute(id);
                  deps.log(LogType.info, 'SQL: "$deleteQuery" with $id')(
                    deps.logger,
                  );
                }),
          ),
    );

final ReaderIO<
        ({Logger logger, Log<Logger> log, CommonDatabase db}), CommonPreparedStatement>
    _prepareDeletes = (deps) => () {
          final ps = deps.db.prepare(deleteQuery);
          deps.log(LogType.info, 'Prepared statement opened')(deps.logger);
          return ps;
        };
