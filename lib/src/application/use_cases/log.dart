import '../commands/log.dart';

typedef Log = ({
  void Function(String) debug,
  void Function(String) info,
  void Function(String) error
});

Log prepareLog({required LogCommand log}) => log;
