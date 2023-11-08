import 'package:logging/logging.dart';
import 'package:sqlite3/wasm.dart';

import '../../../application/commands/delete_foods_by_ids.dart';
import '../../../application/commands/log.dart';
import '../bootstrap.dart';
import '../helpers/prepared_statement.dart';
import '../helpers/transaction.dart';

final class DeleteFoodsByIdsDeps
    implements HasTransactionDeps, HasPreparedStatementDeps {
  const DeleteFoodsByIdsDeps({
    required this.db,
    required this.logger,
    required this.log,
  });

  final CommonDatabase db;

  final Logger logger;

  final Log<Logger> log;

  @override
  ({CommonDatabase db, Log<Logger> log, Logger logger})
      get PREPARED_STATEMENT_DEPS => (log: log, logger: logger, db: db);

  @override
  ({CommonDatabase db, Log<Logger> log, Logger logger}) get TRANSACTION_DEPS =>
      (log: log, logger: logger, db: db);
}

const String deleteQuery =
    'DELETE FROM $FOODS_TABLE WHERE $FOODS_TABLE_NAME = ?;';

final DeleteFoodsByIds<DeleteFoodsByIdsDeps> deleteFoodsByIds =
    (ids) => transaction(
          preparedStatement(
            sql: deleteQuery,
            use: (ps) => (DeleteFoodsByIdsDeps deps) =>
                () => ids.map((id) => [id]).forEach((id) {
                      ps.execute(id);
                      deps.log(LogType.info, 'SQL: "$deleteQuery" with $id')(
                        deps.logger,
                      );
                    }),
          ),
        );
