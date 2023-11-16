import 'package:functionally/extensions/reader_io.dart';
import 'package:functionally/reader_io.dart' as RIO;
import 'package:sqlite3/wasm.dart';

import '../../../application/commands/delete_foods_by_ids.dart';
import '../../../application/commands/log.dart';
import '../bootstrap.dart';
import '../helpers/prepared_statement.dart';
import '../helpers/transaction.dart';

typedef DeleteFoodsByIdsDeps<LOG> = ({CommonDatabase db, LOG logEnv});

const String deleteQuery =
    'DELETE FROM $FOODS_TABLE WHERE $FOODS_TABLE_NAME = ?;';

DeleteFoodsByIds<DeleteFoodsByIdsDeps<LOG>> prepareDeleteFoodsByIds<LOG>({
  required Log<LOG> log,
}) =>
    (ids) => transaction(
          log: log,
          preparedStatement(
            log: log,
            sql: deleteQuery,
            run: (preparedStatement) => RIO
                .make<DeleteFoodsByIdsDeps<LOG>>()
                .map(
                  (_) => ids.map((id) => [id]),
                )
                .flatMap(
                  (ids) => RIO.sequenceArray(
                    ids.map(
                      (id) => RIO
                          .make<DeleteFoodsByIdsDeps<LOG>>()
                          .flatMapIO(
                            (_) => () => preparedStatement.execute(id),
                          )
                          .flatMap(
                            (_) => log
                                .info(
                                  'SQL: "$deleteQuery" with $id',
                                )
                                .local((deps) => deps.logEnv),
                          ),
                    ),
                  ),
                ),
          ).local(_toPreparedStatementDeps),
        ).local(_toTransactionDeps);

TransactionDeps<DeleteFoodsByIdsDeps<LOG>, LOG> _toTransactionDeps<LOG>(
  DeleteFoodsByIdsDeps<LOG> deps,
) =>
    (
      env: deps,
      logEnv: deps.logEnv,
      db: deps.db,
    );

PreparedStatementDeps<DeleteFoodsByIdsDeps<LOG>, LOG>
    _toPreparedStatementDeps<LOG>(
  DeleteFoodsByIdsDeps<LOG> deps,
) =>
        (
          env: deps,
          logEnv: deps.logEnv,
          db: deps.db,
        );
