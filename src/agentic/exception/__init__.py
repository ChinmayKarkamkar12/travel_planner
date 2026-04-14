import sys
import traceback


class CustomException(Exception):
    def __init__(self, error_detail, error_message=None):
        """
        Flexible constructor — accepts either:
          CustomException(sys, e)          — legacy call style
          CustomException("message string") — simple string error
        """
        # Resolve the actual error message string
        if isinstance(error_detail, str):
            msg = error_detail
        elif error_message is not None:
            msg = self._format(error_message)
        else:
            msg = traceback.format_exc() or str(error_detail)

        super().__init__(msg)
        self.error_message = msg

    @staticmethod
    def _format(error):
        exc_type, exc_value, exc_tb = sys.exc_info()
        if exc_tb is not None:
            file_name = exc_tb.tb_frame.f_code.co_filename
            return (
                f"Error in [{file_name}] at line [{exc_tb.tb_lineno}]: {str(error)}"
            )
        return str(error)

    def __str__(self):
        return self.error_message
    

    